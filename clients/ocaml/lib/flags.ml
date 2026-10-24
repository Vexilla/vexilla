open Lwt.Infix
let matches (client:Client.t) (group:Types.Group.t) =
 if client.manifest.version="" then Error `Flag_group_not_found
 else if List.exists(fun(g:Types.Manifest.manifest_group)->g.group_id=group.id&&g.name=group.name)client.manifest.groups then Ok()else Error(`Validation "Group differs from manifest ID/name")
let get ~(client:Client.t) ~(fetch_hook:Fetch.hook) group_id_or_name =
 let key=match group_id_or_name with Types.Group.Id id->`Id id|Name name->`Name name in
 match Lookup.Group_table.find ~key client.group_table with
 | None->Lwt.return_error `Flag_group_not_found
 | Some id->
   Lwt.catch(fun()->fetch_hook(Uri.with_path client.base_url(id^".json")) >|= function
    | Error(`Msg message)->Error(`Fetch message)
    | Ok raw->(try match Types.Group.of_yojson(Unicode.parse raw)with
      | Error message->Error(`Validation message)
      | Ok group->match matches client group with Error e->Error e|Ok()->if group.id=id then Ok group else Error(`Validation "Fetched group differs from requested group")
     with exn->Error(`Validation(Printexc.to_string exn))))
    (fun exn->Lwt.return_error(`Fetch(Printexc.to_string exn)))
let set ~(client:Client.t) ~(group:Types.Group.t) =
 let result=try
  match Types.Group.of_yojson(Types.Group.to_yojson group)with
  | Error message->Error(`Validation message)
  | Ok snapshot->match matches client snapshot with
    | Error e->Error e
    | Ok()->
      let environments=Hashtbl.fold(fun _ env acc->Lookup.Environment_table.set_environment ~environment:env acc)snapshot.environments(Lookup.Environment_table.make())in
      let features=Hashtbl.fold(fun _ f acc->Lookup.Feature_table.set_feature ~feature:f acc)snapshot.features(Lookup.Feature_table.make())in
      let groups=Hashtbl.copy client.flag_groups in Hashtbl.replace groups snapshot.id snapshot;
      (* Lookup.Make uses mutable tables; build fresh composites so other configurations remain owned. *)
      let envs=Lookup.Composite_environment_table.make() and feats=Lookup.Composite_feature_table.make()in
      Hashtbl.iter(fun id _->Option.iter(fun value->ignore(Lookup.Composite_environment_table.set ~key:id ~value envs))(Lookup.Composite_environment_table.find ~key:id client.composite_environment_table);Option.iter(fun value->ignore(Lookup.Composite_feature_table.set ~key:id ~value feats))(Lookup.Composite_feature_table.find ~key:id client.composite_feature_table))groups;
      ignore(Lookup.Composite_environment_table.set ~key:snapshot.id ~value:environments envs);ignore(Lookup.Composite_feature_table.set ~key:snapshot.id ~value:features feats);
      Ok {client with flag_groups=groups;composite_environment_table=envs;composite_feature_table=feats}
 with Validation.Invalid message|Invalid_argument message->Error(`Validation message)in Lwt.return result
let sync ~client ~fetch_hook group_id_or_name =get ~client ~fetch_hook group_id_or_name >>= function Error e->Lwt.return_error e|Ok group->set ~client ~group
