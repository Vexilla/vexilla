[@@@ocaml.warning "-26-27-33"]

open Syntax
open Let

let get ~(client : Client.t) ~fetch_hook group_id_or_name =
  let key =
    match group_id_or_name with
    | Types.Group.Id id -> `Id id
    | Name name -> `Name (Filename.remove_extension name)
  in
  let| group_id =
    client.group_table
    |> Lookup.Group_table.find ~key
    |> Option.to_result ~none:`Flag_group_not_found
  in
  let+ result = Uri.with_path client.base_url group_id |> fetch_hook in
  Lwt.return_ok result

let set ~(client : Client.t) ~group group_id_or_name =
  let key =
    match group_id_or_name with
    | Types.Group.Id id -> `Id id
    | Name name -> `Name (Filename.remove_extension name)
  in
  let| group_id =
    client.group_table
    |> Lookup.Group_table.find ~key
    |> Option.to_result ~none:`Flag_group_not_found
  in
  let () = Hashtbl.replace client.flag_groups group_id group in
  let environment_table =
    client.composite_environment_table
    |> Lookup.Composite_environment_table.find ~key:group_id
    |> Option.value ~default:(Lookup.Environment_table.make ())
    |> Hashtbl.fold
         (fun _ environment environment_table' ->
           Lookup.Environment_table.set_environment ~environment
             environment_table')
         group.environments
  in
  let feature_table =
    client.composite_feature_table
    |> Lookup.Composite_feature_table.find ~key:group_id
    |> Option.value ~default:(Lookup.Feature_table.make ())
    |> Hashtbl.fold
         (fun _ feature feature_table' ->
           Lookup.Feature_table.set_feature ~feature feature_table')
         group.features
  in
  let composite_environment_table =
    Lookup.Composite_environment_table.set ~key:group_id
      ~value:environment_table client.composite_environment_table
  in
  let composite_feature_table =
    Lookup.Composite_feature_table.set ~key:group_id ~value:feature_table
      client.composite_feature_table
  in
  Lwt.return_ok
    { client with composite_environment_table; composite_feature_table }

let sync ~(client : Client.t) ~fetch_hook group_id_or_name =
  let+ group = get ~client ~fetch_hook group_id_or_name in
  Lwt.return_ok @@ set ~client ~group group_id_or_name
