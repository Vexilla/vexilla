open Lwt.Infix
let set ~(client:Client.t) (manifest:Types.Manifest.t) =
 try
  let raw=Types.Manifest.to_yojson manifest in
  match Types.Manifest.of_yojson raw with
  | Error message->Error(`Validation message)
  | Ok snapshot->
    let table=Lookup.Group_table.make() in
    List.iter(fun(g:Types.Manifest.manifest_group)->List.iter(fun name->ignore(Lookup.Group_table.set ~key:(`Id name)~value:g.group_id table);ignore(Lookup.Group_table.set ~key:(`Name name)~value:g.group_id table))[g.group_id;g.name;Compatibility.normalize g.name])snapshot.groups;
    let groups=Hashtbl.create 10 in
    Hashtbl.iter(fun id (g:Types.Group.t)->if List.exists(fun(m:Types.Manifest.manifest_group)->m.group_id=id && m.name=g.name)snapshot.groups then Hashtbl.add groups id g)client.flag_groups;
    let envs=Lookup.Composite_environment_table.make() and features=Lookup.Composite_feature_table.make() in
    Hashtbl.iter(fun id _->Option.iter(fun value->ignore(Lookup.Composite_environment_table.set ~key:id ~value envs))(Lookup.Composite_environment_table.find ~key:id client.composite_environment_table);Option.iter(fun value->ignore(Lookup.Composite_feature_table.set ~key:id ~value features))(Lookup.Composite_feature_table.find ~key:id client.composite_feature_table))groups;
    Ok {client with manifest=snapshot;group_table=table;flag_groups=groups;composite_environment_table=envs;composite_feature_table=features}
 with Validation.Invalid message|Invalid_argument message->Error(`Validation message)
let get ~(client:Client.t) ~(fetch_hook:Fetch.hook) =
 Lwt.catch(fun()->fetch_hook(Uri.with_path client.base_url "manifest.json") >|= function
 | Error(`Msg message)->Error(`Fetch message)
 | Ok raw->(try Types.Manifest.of_yojson(Unicode.parse raw) |> Result.map_error(fun m->`Validation m)with exn->Error(`Validation(Printexc.to_string exn))))
 (fun exn->Lwt.return_error(`Fetch(Printexc.to_string exn)))
let sync ~client ~fetch_hook = get ~client ~fetch_hook >|= function Error e->Error e|Ok manifest->set ~client manifest
