open Syntax
open Let

let set ~(client : Client.t) (manifest : Types.Manifest.t) =
  let update_group_table =
    manifest.groups
    |> List.fold_left
         (fun group_table' { Types.Manifest.group_id; Types.Manifest.name } ->
           let open Lookup in
           group_table'
           |> Group_table.set ~key:(`Id group_id) ~value:group_id
           |> Group_table.set ~key:(`Name name) ~value:group_id)
         client.group_table
  in
  Ok { client with manifest; group_table = update_group_table }
;;

let get ~(client : Client.t) ~(fetch_hook : Fetch.hook) =
  let* result = Uri.with_path client.base_url "manifest.json" |> fetch_hook in
  match result with
  | Ok raw_json ->
      let json = Yojson.Safe.from_string raw_json in
      let| manifest =
        Types.Manifest.of_yojson json |> Result.map_error (fun msg -> `Msg msg)
      in
      Lwt.return_ok manifest
  | Error (`Msg err) ->
      Lwt.return_error
        (`Msg (Fmt.str "Error: failed to fetch manifest: %s\n%!" err))
;;

let sync ~(client : Client.t) ~(fetch_hook : Fetch.hook) =
  let+ manifest = get ~client ~fetch_hook in
  let| updated_client = set ~client manifest in
  Lwt.return_ok updated_client
;;
