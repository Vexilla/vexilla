open Syntax
open! Let

module Schedule = struct
  type schedule_type = Empty | Environment | Global [@deriving of_yojson]

  let schedule_type_to_string = function
    | Empty -> ""
    | Environment -> "environment"
    | Global -> "global"
  ;;

  let schedule_type_of_string = function
    | "" -> Ok Empty
    | "environment" -> Ok Environment
    | "global" -> Ok Global
    | _ -> Error "Invalid schedule type"
  ;;

  let schedule_type_of_yojson = function
    | `String s -> schedule_type_of_string s
    | _ -> Error "Invalid schedule type"
  ;;

  type timezone = Utc | Other of string [@@deriving show]

  let timezone_to_string = function Utc -> "UTC" | Other s -> s
  let timezone_of_string = function "UTC" -> Ok Utc | s -> Ok (Other s)

  let timezone_of_yojson = function
    | `String s -> timezone_of_string s
    | _ -> Error "Invalid timezone"
  ;;

  type time_type = None | Start_end | Daily [@@deriving of_yojson, show]

  let time_type_to_string = function
    | None -> "none"
    | Start_end -> "start/end"
    | Daily -> "daily"
  ;;

  let time_type_of_string = function
    | "none" -> Ok None
    | "start/end" -> Ok Start_end
    | "daily" -> Ok Daily
    | _ -> Error "Invalid time type"
  ;;

  let time_type_of_yojson = function
    | `String s -> time_type_of_string s
    | _ -> Error "Invalid time type"
  ;;

  (* Note: Assume that we are converting from milliseconds -> second for Date_time.t at (de)serialization boundaries*)
  type t = {
    start : int;
    end' : int; [@key "end"]
    timezone : timezone;
    time_type : time_type; [@key "timeType"]
    start_time : int; [@key "startTime"]
    end_time : int; [@key "endTime"]
  }
  [@@deriving make, show, of_yojson { strict = false }]
end

module Feature = struct
  type id = string [@@deriving of_yojson]
  type name = string [@@deriving of_yojson]

  type attributes = {
    feature_id : id; [@key "featureId"]
    name : name;
    schedule : Schedule.t;
    schedule_type : Schedule.schedule_type; [@key "scheduleType"]
  }
  [@@deriving of_yojson { strict = false }]

  type toggle = { attributes : attributes; value : bool }
  [@@deriving of_yojson { strict = false }]

  let toggle_of_yojson (json : Yojson.Safe.t) =
    match json with
    | `Assoc (list : (string * Yojson.Safe.t) list) ->
        let@ feature_id = List.assoc "featureId" list |> id_of_yojson in
        let@ name = List.assoc "name" list |> name_of_yojson in
        let@ schedule = List.assoc "schedule" list |> Schedule.of_yojson in
        let@ schedule_type =
          List.assoc "scheduleType" list |> Schedule.schedule_type_of_yojson
        in
        let@ value =
          List.assoc "value" list
          |> function
          | `Bool value -> Ok value
          | json ->
              Error
                (Format.sprintf "Invalid value for Toggle feature value: %s"
                   (Yojson.Safe.to_string json))
        in
        Ok { attributes = { feature_id; name; schedule; schedule_type }; value }
    | _ -> Error "Invalid Toggle feature"
  ;;

  type gradual = { attributes : attributes; value : float; seed : float }
  [@@deriving of_yojson { strict = false }]

  let gradual_of_yojson (json : Yojson.Safe.t) =
    match json with
    | `Assoc (list : (string * Yojson.Safe.t) list) ->
        let@ feature_id = List.assoc "featureId" list |> id_of_yojson in
        let@ name = List.assoc "name" list |> name_of_yojson in
        let@ schedule = List.assoc "schedule" list |> Schedule.of_yojson in
        let@ schedule_type =
          List.assoc "scheduleType" list |> Schedule.schedule_type_of_yojson
        in
        let@ value =
          List.assoc "value" list
          |> function
          | `Float value -> Ok value
          | `Int value -> Ok (Float.of_int value)
          | json ->
              Error
                (Format.sprintf "Invalid value for Gradual Feature value: %s"
                   (Yojson.Safe.to_string json))
        in
        let@ seed =
          List.assoc "seed" list
          |> function
          | `Float value -> Ok value
          | `Int value -> Ok (Float.of_int value)
          | json ->
              Error
                (Format.sprintf "Invalid value for Gradual Feature seed: %s"
                   (Yojson.Safe.to_string json))
        in
        Ok
          {
            attributes = { feature_id; name; schedule; schedule_type };
            value;
            seed;
          }
    | _ -> Error "Invalid gradual feature"
  ;;

  type selective_value =
    | String_list of string list
    | Int_list of int list
    | Float_list of float list

  let deserialize_selective_value_list ~expected_type json =
    try
      match (expected_type, json) with
      | `String, elements ->
          Ok (String_list (List.map Yojson.Safe.Util.to_string elements))
      | `Int, elements ->
          Ok (Int_list (List.map Yojson.Safe.Util.to_int elements))
      | `Float, elements ->
          Ok (Float_list (List.map Yojson.Safe.Util.to_float elements))
    with _ -> Error "Invalid value type"
  ;;

  type selective = { attributes : attributes; value : selective_value }

  let selective_of_yojson (json : Yojson.Safe.t) =
    match json with
    | `Assoc (list : (string * Yojson.Safe.t) list) ->
        let@ feature_id = List.assoc "featureId" list |> id_of_yojson in
        let@ name = List.assoc "name" list |> name_of_yojson in
        let@ schedule = List.assoc "schedule" list |> Schedule.of_yojson in
        let@ schedule_type =
          List.assoc "scheduleType" list |> Schedule.schedule_type_of_yojson
        in
        let@ value_json =
          try List.assoc "value" list |> Yojson.Safe.Util.to_list |> Result.ok
          with _ -> Error "Invalid value type"
        in
        let@ value =
          List.assoc "valueType" list
          |> function
          | `String value_type when value_type = "string" ->
              deserialize_selective_value_list ~expected_type:`String value_json
          | `String value_type when value_type = "number" -> (
              let number_type = List.assoc "numberType" list in
              match number_type with
              | `String "int" ->
                  deserialize_selective_value_list ~expected_type:`Int
                    value_json
              | `String "float" ->
                  deserialize_selective_value_list ~expected_type:`Float
                    value_json
              | _ -> Error "Invalid number type")
          | _ -> Error "Invalid value type"
        in
        Ok { attributes = { feature_id; name; schedule; schedule_type }; value }
    | _ -> Error "Invalid Selective feature"
  ;;

  type scalar_value = String of string | Int of int | Float of float

  let scalar_value_of_yojson = function
    | `String s -> Ok (String s)
    | `Int i -> Ok (Int i)
    | `Float f -> Ok (Float f)
    | _ -> Error "Invalid scalar value"
  ;;

  type value = { attributes : attributes; value : scalar_value }
  [@@deriving of_yojson { strict = false }]

  let value_of_yojson (json : Yojson.Safe.t) =
    match json with
    | `Assoc (list : (string * Yojson.Safe.t) list) ->
        let@ feature_id = List.assoc "featureId" list |> id_of_yojson in
        let@ name = List.assoc "name" list |> name_of_yojson in
        let@ schedule = List.assoc "schedule" list |> Schedule.of_yojson in
        let@ schedule_type =
          List.assoc "scheduleType" list |> Schedule.schedule_type_of_yojson
        in
        let@ value = List.assoc "value" list |> scalar_value_of_yojson in
        Ok { attributes = { feature_id; name; schedule; schedule_type }; value }
    | _ -> Error "Invalid Value feature"
  ;;

  type t =
    | Toggle of toggle
    | Gradual of gradual
    | Selective of selective
    | Value of value

  let of_yojson (json : Yojson.Safe.t) : (t, 'error) result =
    let feature_type = Yojson.Safe.Util.member "featureType" json in
    match feature_type with
    | `String "gradual" ->
        gradual_of_yojson json |> Result.map (fun g -> Gradual g)
    | `String "toggle" ->
        toggle_of_yojson json |> Result.map (fun t -> Toggle t)
    | `String "selective" ->
        selective_of_yojson json |> Result.map (fun s -> Selective s)
    | `String "value" -> value_of_yojson json |> Result.map (fun v -> Value v)
    | _ -> failwith "Invalid feature type"
  ;;

  let attributes = function
    | Toggle t -> t.attributes
    | Gradual g -> g.attributes
    | Selective s -> s.attributes
    | Value v -> v.attributes
  ;;
end

module Environment = struct
  type name = string [@@deriving of_yojson]
  type id = string [@@deriving of_yojson]
  type feature_key = [ `Id of Feature.id | `Name of Feature.name ]

  let feature_key_of_yojson = function
    | `String s -> Ok (`Id s)
    | _ -> Error "Invalid feature key"
  ;;

  let features_of_yojson =
    Utils.hashtbl_of_yojson feature_key_of_yojson Feature.of_yojson
  ;;

  type t = {
    name : name;
    id : id; [@key "environmentId"]
    features : (feature_key, Feature.t) Hashtbl.t;
        [@of_yojson features_of_yojson]
  }
  [@@deriving of_yojson { strict = false }]
end

module Group = struct
  type name = string [@@deriving of_yojson]
  type id = string [@@deriving of_yojson]
  type meta = { version : string } [@@deriving of_yojson]
  type group_id_or_name = Id of id | Name of name

  let environments_of_yojson =
    Utils.hashtbl_of_yojson Environment.id_of_yojson Environment.of_yojson
  ;;

  let features_of_yojson =
    Utils.hashtbl_of_yojson Feature.id_of_yojson Feature.of_yojson
  ;;

  type t = {
    id : id; [@key "groupId"]
    name : name;
    meta : meta;
    features : (Feature.id, Feature.t) Hashtbl.t;
        [@of_yojson features_of_yojson]
    environments : (Environment.id, Environment.t) Hashtbl.t;
        [@of_yojson environments_of_yojson]
  }
  [@@deriving make, of_yojson { strict = false }]
end

module Manifest = struct
  type group_name = Group.name [@@deriving of_yojson]
  type group_id = Group.id [@@deriving of_yojson]

  type manifest_group = { name : string; group_id : string [@key "groupId"] }
  [@@deriving of_yojson, show]

  type t = { version : string; groups : manifest_group list }
  [@@deriving of_yojson, show]

  let empty = { version = ""; groups = [] }
end
