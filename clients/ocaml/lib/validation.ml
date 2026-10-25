exception Invalid of string

let check ok message = if not ok then raise (Invalid message)

let obj = function
  | `Assoc fields -> fields
  | _ -> raise (Invalid "Expected object")
;;

let array = function
  | `List values -> values
  | _ -> raise (Invalid "Expected array")
;;

let get key value = Option.value (List.assoc_opt key (obj value)) ~default:`Null

let text ?(nonempty = false) = function
  | `String string_value when (not nonempty) || string_value <> "" ->
      string_value
  | _ -> raise (Invalid "Expected string")
;;

let number ?(integer = false) value =
  let number_value =
    match value with
    | `Int number_value -> float_of_int number_value
    | `Float number_value -> number_value
    | `Intlit numeric_literal -> (
        try float_of_string numeric_literal with _ -> nan)
    | _ -> nan
  in
  check
    (Float.is_finite number_value
    && ((not integer)
       || Float.floor number_value = number_value
          && Float.abs number_value <= 9007199254740991.))
    "Expected finite number in integer bounds";
  number_value
;;

let rec tree = function
  | `String string_value ->
      check (Unicode.valid string_value) "Malformed Unicode string"
  | `Assoc fields ->
      List.iter
        (fun (k, value) ->
          check (Unicode.valid k) "Malformed Unicode key";
          tree value)
        fields
  | `List values -> List.iter tree values
  | _ -> ()
;;

let member value allowed =
  check (List.mem (text value) allowed) "Unsupported enum"
;;

let safe_id value =
  let id = text ~nonempty:true value in
  check
    ((not (List.mem id [ "manifest"; "config"; "."; ".." ]))
    && not (String.exists (fun c -> c = '/' || c = '\\' || c = '\000') id))
    "Unsafe group ID";
  id
;;

let alias table id name =
  List.iter
    (fun key ->
      check
        ((not (Hashtbl.mem table key)) || Hashtbl.find table key = id)
        "Alias collision";
      Hashtbl.replace table key id)
    [ id; name; Compatibility.normalize name ]
;;

let schedule value =
  tree value;
  ignore (obj value);
  List.iter
    (fun k -> ignore (number ~integer:true (get k value)))
    [ "start"; "end"; "startTime"; "endTime" ];
  member (get "timeType" value) [ "none"; "start/end"; "daily" ];
  check
    (Compatibility.timezone (text ~nonempty:true (get "timezone" value)))
    "Invalid timezone"
;;

let feature value =
  tree value;
  ignore (obj value);
  ignore (text (get "name" value));
  ignore (text ~nonempty:true (get "featureId" value));
  member (get "scheduleType" value) [ ""; "global"; "environment" ];
  schedule (get "schedule" value);
  match text (get "featureType" value) with
  | "toggle" ->
      check
        (match get "value" value with `Bool _ -> true | _ -> false)
        "Toggle must be boolean"
  | "gradual" ->
      ignore (number (get "value" value));
      let seed = number (get "seed" value) in
      check (seed > 0. && seed <= 1.) "seed must satisfy 0 < seed <= 1"
  | ("selective" | "value") as kind ->
      member (get "valueType" value) [ "string"; "number" ];
      let numeric = get "valueType" value = `String "number" in
      if numeric then member (get "numberType" value) [ "int"; "float" ];
      let item x =
        if numeric then
          ignore (number ~integer:(get "numberType" value = `String "int") x)
        else ignore (text x)
      in
      if kind = "selective" then List.iter item (array (get "value" value))
      else item (get "value" value)
  | _ -> raise (Invalid "Unsupported featureType")
;;

let features value =
  let fields = obj value in
  let aliases = Hashtbl.create 10 in
  List.iter
    (fun (feature_id, feature_data) ->
      feature feature_data;
      check
        (text ~nonempty:true (get "featureId" feature_data) = feature_id)
        "Feature map ID mismatch";
      alias aliases feature_id (text (get "name" feature_data)))
    fields;
  fields
;;

let manifest value =
  tree value;
  check (get "version" value = `String "v1") "Manifest version must be v1";
  let ids = Hashtbl.create 10 and aliases = Hashtbl.create 10 in
  List.iter
    (fun group ->
      let id = safe_id (get "groupId" group) in
      check (not (Hashtbl.mem ids id)) "Duplicate group ID";
      Hashtbl.add ids id ();
      alias aliases id (text (get "name" group)))
    (array (get "groups" value))
;;

let same left right key =
  match (List.assoc_opt key (obj left), List.assoc_opt key (obj right)) with
  | None, None -> true
  | Some (`Assoc _ | `List _), _ | _, Some (`Assoc _ | `List _) -> false
  | Some ((`Int _ | `Float _) as left), Some ((`Int _ | `Float _) as right) ->
      number left = number right
  | left, right -> left = right
;;

let group value =
  tree value;
  ignore (safe_id (get "groupId" value));
  ignore (text (get "name" value));
  check
    (get "version" (get "meta" value) = `String "v1")
    "Group version must be v1";
  let defaults = features (get "features" value) in
  let aliases = Hashtbl.create 10 in
  List.iter
    (fun (id, environment) ->
      check
        (text ~nonempty:true (get "environmentId" environment) = id)
        "Environment map ID mismatch";
      alias aliases id (text (get "name" environment));
      let values = features (get "features" environment) in
      check
        (List.sort compare (List.map fst values)
        = List.sort compare (List.map fst defaults))
        "Incomplete environment features";
      List.iter
        (fun (feature_id, feature) ->
          let original = List.assoc feature_id defaults in
          List.iter
            (fun k ->
              check (same feature original k)
                "Environment feature identity/subtype mismatch")
            [ "name"; "featureType"; "valueType"; "numberType" ])
        values)
    (obj (get "environments" value))
;;

let result check_value decode value =
  try
    check_value value;
    decode value
  with
  | Invalid message | Invalid_argument message | Failure message ->
      Error message
  | Not_found -> Error "Missing required field"
;;
