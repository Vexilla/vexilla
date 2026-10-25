open Lwt.Infix

let matches (client : Client.t) (group : Types.Group.t) =
  if client.manifest.version = "" then Error `Flag_group_not_found
  else if
    List.exists
      (fun (manifest_group : Types.Manifest.manifest_group) ->
        manifest_group.group_id = group.id && manifest_group.name = group.name)
      client.manifest.groups
  then Ok ()
  else Error (`Validation "Group differs from manifest ID/name")
;;

let get ~(client : Client.t) ~(fetch_hook : Fetch.hook) group_id_or_name =
  let group_key =
    match group_id_or_name with
    | Types.Group.Id group_id -> `Id group_id
    | Name group_name -> `Name group_name
  in
  let result =
    match Lookup.Group_table.find ~key:group_key client.group_table with
    | None -> Lwt.return_error `Flag_group_not_found
    | Some group_id ->
        Lwt.catch
          (fun () ->
            fetch_hook (Uri.with_path client.base_url (group_id ^ ".json"))
            >|= function
            | Error (`Msg message) -> Error (`Fetch message)
            | Ok group_json -> (
                try
                  match Types.Group.of_yojson (Unicode.parse group_json) with
                  | Error message -> Error (`Validation message)
                  | Ok group -> (
                      match matches client group with
                      | Error error -> Error error
                      | Ok () ->
                          if group.id = group_id then Ok group
                          else
                            Error
                              (`Validation
                                 "Fetched group differs from requested group"))
                with error -> Error (`Validation (Printexc.to_string error))))
          (fun error -> Lwt.return_error (`Fetch (Printexc.to_string error)))
  in
  result >|= Client.report_operation ~client ~operation:"group.fetch"
;;

let set ~(client : Client.t) ~(group : Types.Group.t) =
  let result =
    try
      match Types.Group.of_yojson (Types.Group.to_yojson group) with
      | Error message -> Error (`Validation message)
      | Ok group_snapshot -> (
          match matches client group_snapshot with
          | Error error -> Error error
          | Ok () ->
              let environment_table =
                Hashtbl.fold
                  (fun _ environment environment_aliases ->
                    Lookup.Environment_table.set_environment ~environment
                      environment_aliases)
                  group_snapshot.environments
                  (Lookup.Environment_table.make ())
              in
              let feature_table =
                Hashtbl.fold
                  (fun _ feature feature_aliases ->
                    Lookup.Feature_table.set_feature ~feature feature_aliases)
                  group_snapshot.features
                  (Lookup.Feature_table.make ())
              in
              let installed_groups = Hashtbl.copy client.flag_groups in
              Hashtbl.replace installed_groups group_snapshot.id group_snapshot;
              (* Fresh composites prevent replacement from changing another configuration. *)
              let environment_tables =
                Lookup.Composite_environment_table.make ()
              in
              let feature_tables = Lookup.Composite_feature_table.make () in
              Hashtbl.iter
                (fun group_id _ ->
                  Option.iter
                    (fun existing_environment_table ->
                      ignore
                        (Lookup.Composite_environment_table.set ~key:group_id
                           ~value:existing_environment_table environment_tables))
                    (Lookup.Composite_environment_table.find ~key:group_id
                       client.composite_environment_table);
                  Option.iter
                    (fun existing_feature_table ->
                      ignore
                        (Lookup.Composite_feature_table.set ~key:group_id
                           ~value:existing_feature_table feature_tables))
                    (Lookup.Composite_feature_table.find ~key:group_id
                       client.composite_feature_table))
                installed_groups;
              ignore
                (Lookup.Composite_environment_table.set ~key:group_snapshot.id
                   ~value:environment_table environment_tables);
              ignore
                (Lookup.Composite_feature_table.set ~key:group_snapshot.id
                   ~value:feature_table feature_tables);
              Ok
                {
                  client with
                  flag_groups = installed_groups;
                  composite_environment_table = environment_tables;
                  composite_feature_table = feature_tables;
                })
    with Validation.Invalid message | Invalid_argument message ->
      Error (`Validation message)
  in
  Lwt.return (Client.report_operation ~client ~operation:"group.install" result)
;;

let sync ~client ~fetch_hook group_id_or_name =
  get ~client ~fetch_hook group_id_or_name
  >>= function
  | Error error -> Lwt.return_error error
  | Ok group -> set ~client ~group
;;
