open Syntax
open Let

type t = {
  environment : [ `Id of string | `Name of string ];
  base_url : Uri.t;
  instance_id : string;
  custom_instance_id :
    [ `String of string | `Int of int | `Float of float | `Missing | `Invalid ]
    option;
  show_logs : bool;
  manifest : Types.Manifest.t;
  flag_groups : (Types.Group.id, Types.Group.t) Hashtbl.t;
  group_table : Lookup.Group_table.t;
  composite_environment_table : Lookup.Composite_environment_table.t;
  composite_feature_table : Lookup.Composite_feature_table.t;
}

let make ?custom_instance_id ?(show_logs = false) ~environment ~base_url
    ~instance_id () =
  {
    environment;
    base_url;
    instance_id;
    custom_instance_id;
    show_logs;
    manifest = Types.Manifest.empty;
    flag_groups = Hashtbl.create 10;
    group_table = Lookup.Group_table.make ();
    composite_environment_table = Lookup.Composite_environment_table.make ();
    composite_feature_table = Lookup.Composite_feature_table.make ();
  }
;;

let report_operation ~client ~operation result =
  (if client.show_logs then
     let outcome =
       match result with Ok _ -> "success" | Error _ -> "failure"
     in
     Format.eprintf "vexilla operation=%s outcome=%s@." operation outcome);
  result
;;

let get_real_group_id ~client group_id_or_name =
  client.group_table
  |> Lookup.Group_table.find ~key:group_id_or_name
  |> Option.to_result ~none:`Flag_group_not_found
;;

let get_real_feature_id ~client group_id feature_id_or_name =
  let open Infix.Result in
  client.composite_feature_table
  |> Lookup.Composite_feature_table.find ~key:group_id
  |> Option.to_result ~none:`Flag_group_not_found
  >>= fun feature_table ->
  Lookup.Feature_table.find ~key:feature_id_or_name feature_table
  |> Option.to_result ~none:`Feature_not_found
;;

let get_real_environment_id ~client group_id =
  let open Infix.Result in
  client.composite_environment_table
  |> Lookup.Composite_environment_table.find ~key:group_id
  |> Option.to_result ~none:`Flag_group_not_found
  >>= fun environment_table ->
  Lookup.Environment_table.find ~key:client.environment environment_table
  |> Option.to_result ~none:`Environment_not_found
;;

let get_real_ids ~client group_id_or_name feature_name_or_id =
  let@ group_id = get_real_group_id ~client group_id_or_name in
  let@ feature_id = get_real_feature_id ~client group_id feature_name_or_id in
  let@ environment_id = get_real_environment_id ~client group_id in
  Ok (group_id, feature_id, environment_id)
;;

let get_feature ~client group_id_or_name feature_name_or_id =
  let@ group_id, feature_id, environment_id =
    get_real_ids ~client group_id_or_name feature_name_or_id
  in
  let@ group =
    Hashtbl.find_opt client.flag_groups group_id
    |> Option.to_result ~none:`Flag_group_not_found
  in
  let@ environment =
    Hashtbl.find_opt group.environments environment_id
    |> Option.to_result ~none:`Environment_not_found
  in
  Hashtbl.find_opt environment.features (`Id feature_id)
  |> Option.to_result ~none:`Feature_not_found
;;

let should ~client ?instance_id group_id_or_name feature_name_or_id =
  let open Types.Feature in
  let@ feature = get_feature ~client group_id_or_name feature_name_or_id in
  match feature with
  | Value _ -> Error (`Unsupported_should_feature_type "feature")
  | _ -> (
      let effective_instance_id =
        Option.value instance_id
          ~default:
            (Option.value client.custom_instance_id
               ~default:(`String client.instance_id))
      in
      let@ instance_text =
        match feature with
        | Toggle _ -> Ok ""
        | _ -> Hash.instance_text effective_instance_id
      in
      let@ is_active = Schedule.is_schedule_feature_active feature in
      if not is_active then Ok false
      else
        match feature with
        | Toggle toggle_feature -> Ok toggle_feature.value
        | Gradual gradual_feature ->
            Ok
              (Hash.hash_instance_id ~seed:gradual_feature.seed instance_text
              < gradual_feature.value)
        | Selective selective_feature ->
            Ok
              (match (selective_feature.value, effective_instance_id) with
              | String_list members, `String instance ->
                  List.mem instance members
              | Int_list members, `Int instance -> List.mem instance members
              | Int_list members, `Float instance ->
                  List.exists
                    (fun member -> float_of_int member = instance)
                    members
              | Float_list members, `Int instance ->
                  List.mem (float_of_int instance) members
              | Float_list members, `Float instance -> List.mem instance members
              | _ -> false)
        | Value _ -> assert false)
;;

let value ~client ~default ~group_key ~feature_key =
  let@ feature = get_feature ~client group_key feature_key in
  match feature with
  | Types.Feature.Value value_feature ->
      let@ is_active = Schedule.is_schedule_feature_active feature in
      Ok (if is_active then value_feature.value else default)
  | _ -> Error `Unsupported_value_feature_type
;;
