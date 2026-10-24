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

  type time_type = None | Start_end | Daily [@@deriving of_yojson { strict = false }, show]

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
  let generated_of_yojson = of_yojson
  let of_yojson value =
    Validation.result Validation.schedule (fun value ->
      let fields = Yojson.Safe.Util.to_assoc value |> List.map (fun (k,v) ->
        if List.mem k ["start";"end";"startTime";"endTime"] then k, `Int (int_of_float (Validation.number ~integer:true v)) else k,v) in
      generated_of_yojson (`Assoc fields)) value
  let to_yojson s = `Assoc ["start",`Int s.start;"end",`Int s.end';"timezone",`String(timezone_to_string s.timezone);"timeType",`String(time_type_to_string s.time_type);"startTime",`Int s.start_time;"endTime",`Int s.end_time]
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
          | `Float value when value > 0. && value <= 1. -> Ok value
          | `Int 1 -> Ok 1.
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
          Ok (Int_list (List.map (fun v -> int_of_float (Validation.number ~integer:true v)) elements))
      | `Float, elements ->
          Ok (Float_list (List.map (function `Float f -> f | `Int i -> float_of_int i | _ -> failwith "Expected float") elements))
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
        let raw_value = List.assoc "value" list in
        let@ value = match List.assoc "valueType" list with
          | `String "number" when List.assoc "numberType" list = `String "float" ->
              (match raw_value with
               | `Int i -> Ok (Float (float_of_int i))
               | `Float f -> Ok (Float f)
               | _ -> Error "Invalid float value")
          | `String "number" -> Ok (Int (int_of_float (Validation.number ~integer:true raw_value)))
          | _ -> scalar_value_of_yojson raw_value
        in
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

  let generated_of_yojson = of_yojson
  let of_yojson value = Validation.result Validation.feature generated_of_yojson value

  let attributes = function
    | Toggle t -> t.attributes
    | Gradual g -> g.attributes
    | Selective s -> s.attributes
    | Value v -> v.attributes
  ;;
  let to_yojson feature =
    let a=attributes feature in
    let common=["name",`String a.name;"featureId",`String a.feature_id;"schedule",Schedule.to_yojson a.schedule;"scheduleType",`String(Schedule.schedule_type_to_string a.schedule_type)] in
    let fields=match feature with
    | Toggle f->["featureType",`String "toggle";"value",`Bool f.value]
    | Gradual f->["featureType",`String "gradual";"value",`Float f.value;"seed",`Float f.seed]
    | Selective f->let subtype,value=match f.value with
      | String_list xs->["valueType",`String "string"],`List(List.map(fun s->`String s)xs)
      | Int_list xs->["valueType",`String "number";"numberType",`String "int"],`List(List.map(fun n->`Int n)xs)
      | Float_list xs->["valueType",`String "number";"numberType",`String "float"],`List(List.map(fun n->`Float n)xs)in
      ["featureType",`String "selective";"value",value]@subtype
    | Value f->let subtype,value=match f.value with
      | String s->["valueType",`String "string"],`String s
      | Int n->["valueType",`String "number";"numberType",`String "int"],`Int n
      | Float n->["valueType",`String "number";"numberType",`String "float"],`Float n in
      ["featureType",`String "value";"value",value]@subtype in `Assoc(common@fields)
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
  let to_yojson e = `Assoc ["name",`String e.name;"environmentId",`String e.id;"features",`Assoc(Hashtbl.fold(fun key f acc->match key with `Id id->(id,Feature.to_yojson f)::acc|`Name _->raise(Validation.Invalid "Native feature map key must be ID"))e.features [])]
end

module Group = struct
  type name = string [@@deriving of_yojson]
  type id = string [@@deriving of_yojson]
  type meta = { version : string } [@@deriving of_yojson { strict = false }]
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
  let generated_of_yojson = of_yojson
  let of_yojson value = Validation.result Validation.group generated_of_yojson value
  let to_yojson g = `Assoc ["name",`String g.name;"groupId",`String g.id;"meta",`Assoc["version",`String g.meta.version];"features",`Assoc(Hashtbl.fold(fun id f acc->(id,Feature.to_yojson f)::acc)g.features []);"environments",`Assoc(Hashtbl.fold(fun id e acc->(id,Environment.to_yojson e)::acc)g.environments [])]
end

module Manifest = struct
  type group_name = Group.name [@@deriving of_yojson]
  type group_id = Group.id [@@deriving of_yojson]

  type manifest_group = { name : string; group_id : string [@key "groupId"] }
  [@@deriving of_yojson { strict = false }, show]

  type t = { version : string; groups : manifest_group list }
  [@@deriving of_yojson { strict = false }, show]

  let generated_of_yojson = of_yojson
  let of_yojson value = Validation.result Validation.manifest generated_of_yojson value
  let to_yojson m = `Assoc ["version",`String m.version;"groups",`List(List.map(fun g->`Assoc["name",`String g.name;"groupId",`String g.group_id])m.groups)]
  let empty = { version = ""; groups = [] }
end
