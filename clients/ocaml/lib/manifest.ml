open Syntax
open Let

let set_manifest ~(client : Client.t) (manifest : Types.Manifest.t) =
  if manifest.version <> Types.Manifest.latest_manifest_version then
    Error (`Invalid_manifest_version manifest.version)
  else
    let update_group_table =
      manifest.groups
      |> List.fold_left
           (fun group_table' { Types.Manifest.id; Types.Manifest.name } ->
             let open Lookup in
             group_table'
             |> Group_table.set ~key:(`Id id) ~value:id
             |> Group_table.set ~key:(`Name name) ~value:id)
           client.group_table
    in
    Ok { client with manifest; group_table = update_group_table }

let get ~(client : Client.t) ~fetch_hook =
  let* result = Uri.with_path client.base_url "manifest.json" |> fetch_hook in
  match result with
  | Ok manifest -> Lwt.return manifest
  | Error err ->
      Fmt.pr "Error: failed to fetch manifest: %s\n%!" (Error.to_string err);
      Lwt.return Types.Manifest.empty

let sync ~(client : Client.t) ~fetch_hook =
  let* manifest = get ~client ~fetch_hook in
  Lwt.return @@ set_manifest ~client manifest
