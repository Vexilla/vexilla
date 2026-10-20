open Vexilla
open Private
open Lwt.Infix
open Yojson.Safe.Util

let ok = function Ok x -> x | Error _ -> failwith "Contract ingestion/evaluation failed"
let root = Sys.getenv "VEXILLA_CONTRACT_DIR"
let read name = let c = open_in_bin (Filename.concat root name) in let text = really_input_string c (in_channel_length c) in close_in c; text
let expected = read "expected.json" |> Yojson.Safe.from_string
let text key json = json |> member key |> to_string
let number = function `Int n -> float_of_int n | `Float f -> f | _ -> failwith "number expected"
let fetch_hook uri = Lwt.return_ok (read (Filename.basename (Uri.path uri)))
let check condition label =
  if not condition then begin
    failwith ("Contract mismatch: " ^ label)
  end

let seed_bounds () =
  let original = read "contract-group.json" |> Yojson.Safe.from_string in
  expected |> member "seedCases" |> to_list |> List.iter (fun sample ->
    let replace key value json =
      let fields = to_assoc json in
      `Assoc (List.map (fun (k, v) -> (k, if k = key then begin value end else begin v end)) fields)
    in
    let environments = member "environments" original in
    let environment = member "dev" environments in
    let features = member "features" environment in
    let feature = replace "seed" (member "value" sample) (member "gradual" features) in
    let features = replace "gradual" feature features in
    let environment = replace "features" features environment in
    let group = replace "environments" (replace "dev" environment environments) original in
    let accepted = Result.is_ok (Types.Group.of_yojson group) in
    check (accepted = to_bool (member "valid" sample)) ("seed " ^ Yojson.Safe.to_string (member "value" sample)))

let run env names =
  let id = text "id" env in
  let group_key = if names then begin `Name (text "groupName" expected) end else begin `Id (text "groupId" expected) end in
  let request = if names then begin Types.Group.Name (text "groupName" expected) end else begin Types.Group.Id (text "groupId" expected) end in
  let environment = if names then begin `Name (text "name" env) end else begin `Id id end in
  let client = make_client ~base_url:(Uri.of_string "https://contract") ~environment ~instance_id:"member" () in
  sync_manifest ~client ~fetch_hook >>= fun result ->
  let client = ok result in
  sync_flags ~client ~fetch_hook request >>= fun result ->
  (* The production sync API returns the result of Flags.set as a nested promise. *)
  ok result >>= fun result ->
  let client = ok result in
  let group = Hashtbl.find client.flag_groups (text "groupId" expected) in
  let environment = Hashtbl.find group.environments id in
  (match Hashtbl.find environment.features (`Id "gradual") with
   | Types.Feature.Gradual f -> check (f.seed = number (member "seed" env)) "seed"; check (f.value = number (member "threshold" env)) "threshold"
   | _ -> failwith "Gradual discriminator lost");
  let clock = Date_time.from_ms ~ms:(expected |> member "referenceClock" |> to_int) |> Option.get in
  (expected |> member "scheduled" |> to_list |> List.map to_string |> fun ids -> ids @ ["scheduled-active"]) |> List.iter (fun fid ->
    let a = Hashtbl.find environment.features (`Id fid) |> Types.Feature.attributes in
    check ((Schedule.is_schedule_active_with_now ~schedule:a.schedule ~schedule_type:a.schedule_type clock |> ok) = (fid="scheduled-active")) "reference clock");
  expected |> member "cases" |> to_list |> List.iter (fun c ->
    let fid = text (if names then begin "name" end else begin "id" end) c in
    let feature_key = if names then begin `Name fid end else begin `Id fid end in
    let want = member (text "expectedKey" c) env in
    if text "kind" c = "value" then (
      let result = value ~client ~default:(Types.Feature.String "fallback") ~group_key ~feature_key |> ok in
      check (match result,want with
        | Types.Feature.String s, `String w -> s=w
        | Types.Feature.Int n, `Int w -> n=w
        | Types.Feature.Float f, w -> f=number w
        | _ -> false) fid
    ) else (
      let instance_id = match member "instance" c with
        | `String s -> `String s
        | `Int n when text "id" c = "selective-int" -> `Int n
        | n -> `Float (number n) in
      check ((should ~client ~instance_id group_key feature_key |> ok) = to_bool want) fid
    ));
  expected |> member "scheduled" |> to_list |> List.iter (fun f -> check (not (should ~client group_key (`Id (to_string f)) |> ok)) "schedule");
  Lwt.return_unit

let () = seed_bounds (); Lwt_main.run (Lwt_list.iter_s (fun env -> Lwt_list.iter_s (run env) [false;true]) (expected |> member "environments" |> to_list)); print_endline "Shared OCaml contract passed"
