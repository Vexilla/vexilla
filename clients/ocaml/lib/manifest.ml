open Lwt.Infix

let set ~(client : Client.t) (manifest : Types.Manifest.t) =
  let result =
    try
      let manifest_data = Types.Manifest.to_yojson manifest in
      match Types.Manifest.of_yojson manifest_data with
      | Error message -> Error (`Validation message)
      | Ok manifest_snapshot ->
          let group_table = Lookup.Group_table.make () in
          List.iter
            (fun (manifest_group : Types.Manifest.manifest_group) ->
              List.iter
                (fun group_alias ->
                  ignore
                    (Lookup.Group_table.set ~key:(`Id group_alias)
                       ~value:manifest_group.group_id group_table);
                  ignore
                    (Lookup.Group_table.set ~key:(`Name group_alias)
                       ~value:manifest_group.group_id group_table))
                [
                  manifest_group.group_id;
                  manifest_group.name;
                  Compatibility.normalize manifest_group.name;
                ])
            manifest_snapshot.groups;
          let surviving_groups = Hashtbl.create 10 in
          Hashtbl.iter
            (fun group_id (installed_group : Types.Group.t) ->
              if
                List.exists
                  (fun (manifest_group : Types.Manifest.manifest_group) ->
                    manifest_group.group_id = group_id
                    && manifest_group.name = installed_group.name)
                  manifest_snapshot.groups
              then Hashtbl.add surviving_groups group_id installed_group)
            client.flag_groups;
          let environment_tables = Lookup.Composite_environment_table.make () in
          let feature_tables = Lookup.Composite_feature_table.make () in
          Hashtbl.iter
            (fun group_id _ ->
              Option.iter
                (fun environment_table ->
                  ignore
                    (Lookup.Composite_environment_table.set ~key:group_id
                       ~value:environment_table environment_tables))
                (Lookup.Composite_environment_table.find ~key:group_id
                   client.composite_environment_table);
              Option.iter
                (fun feature_table ->
                  ignore
                    (Lookup.Composite_feature_table.set ~key:group_id
                       ~value:feature_table feature_tables))
                (Lookup.Composite_feature_table.find ~key:group_id
                   client.composite_feature_table))
            surviving_groups;
          Ok
            {
              client with
              manifest = manifest_snapshot;
              group_table;
              flag_groups = surviving_groups;
              composite_environment_table = environment_tables;
              composite_feature_table = feature_tables;
            }
    with Validation.Invalid message | Invalid_argument message ->
      Error (`Validation message)
  in
  Client.report_operation ~client ~operation:"manifest.install" result
;;

let get ~(client : Client.t) ~(fetch_hook : Fetch.hook) =
  Lwt.catch
    (fun () ->
      fetch_hook (Uri.with_path client.base_url "manifest.json")
      >|= function
      | Error (`Msg message) -> Error (`Fetch message)
      | Ok manifest_json -> (
          try
            Types.Manifest.of_yojson (Unicode.parse manifest_json)
            |> Result.map_error (fun message -> `Validation message)
          with error -> Error (`Validation (Printexc.to_string error))))
    (fun error -> Lwt.return_error (`Fetch (Printexc.to_string error)))
  >|= Client.report_operation ~client ~operation:"manifest.fetch"
;;

let sync ~client ~fetch_hook =
  get ~client ~fetch_hook
  >|= function
  | Error error -> Error error
  | Ok manifest -> set ~client manifest
;;
