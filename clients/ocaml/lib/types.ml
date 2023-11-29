open Syntax
open! Let

module Schedule = struct
  type schedule_type = Empty | Environment | Global

  let schedule_type_to_string = function
    | Empty -> ""
    | Environment -> "environment"
    | Global -> "global"

  let schedule_type_of_string = function
    | "" -> Ok Empty
    | "environment" -> Ok Environment
    | "global" -> Ok Global
    | _ -> Error "Invalid schedule type"

  let schedule_type_of_yojson = function
    | `String s -> schedule_type_of_string s
    | _ -> Error "Invalid schedule type"

  type timezone = Utc | Other of string

  let timezone_to_string = function Utc -> "UTC" | Other s -> s
  let timezone_of_string = function "UTC" -> Ok Utc | s -> Ok (Other s)

  let timezone_of_yojson = function
    | `String s -> timezone_of_string s
    | _ -> Error "Invalid timezone"

  type time_type = None | Start_end | Daily

  let time_type_to_string = function
    | None -> ""
    | Start_end -> "start/end"
    | Daily -> "daily"

  let time_type_of_string = function
    | "" -> Ok None
    | "start/end" -> Ok Start_end
    | "daily" -> Ok Daily
    | _ -> Error "Invalid time type"

  let time_type_of_yojson = function
    | `String s -> time_type_of_string s
    | _ -> Error "Invalid time type"

  (* Note: Assume that we are converting from milliseconds -> second for Date_time.t at (de)serialization boundaries*)
  type t = {
    start : Date_time.t;
    end' : Date_time.t;
    timezone : timezone;
    time_type : time_type;
    start_time : Date_time.t;
    end_time : Date_time.t;
  }
  [@@deriving make, of_yojson]
end

module Feature = struct
  type id = string [@@deriving of_yojson]
  type name = string [@@deriving of_yojson]

  type attributes = {
    id : id;
    name : name;
    schedule : Schedule.t;
    schedule_type : Schedule.schedule_type;
  }
  [@@deriving of_yojson]

  type toggle = { attributes : attributes; value : bool } [@@deriving of_yojson]

  type gradual = { attributes : attributes; value : float; seed : float }
  [@@deriving of_yojson]

  type selective_value =
    | String_list of string list
    | Int_list of int list
    | Float_list of float list
  [@@deriving of_yojson]

  type selective = { attributes : attributes; value : selective_value }
  [@@deriving of_yojson]

  type scalar_value = String of string | Int of int | Float of float
  [@@deriving of_yojson]

  type value = { attributes : attributes; value : scalar_value }
  [@@deriving of_yojson]

  type t =
    | Toggle of toggle
    | Gradual of gradual
    | Selective of selective
    | Value of value
  [@@deriving of_yojson]

  let attributes = function
    | Toggle t -> t.attributes
    | Gradual g -> g.attributes
    | Selective s -> s.attributes
    | Value v -> v.attributes
end

module Environment = struct
  type name = string [@@deriving of_yojson]
  type id = string [@@deriving of_yojson]

  type default_features = {
    toggle : Feature.toggle;
    gradual : Feature.gradual;
    selective : Feature.selective;
    value : Feature.value;
  }
  [@@deriving of_yojson]

  type feature_key = [ `Id of Feature.id | `Name of Feature.name ]

  let feature_key_of_yojson = function
    | `String s -> Ok (`Id s)
    | _ -> Error "Invalid feature key"

  let features_of_yojson =
    Utils.hashtbl_of_yojson feature_key_of_yojson Feature.of_yojson

  type t = {
    name : name;
    id : id;
    default_features : default_features;
    features : (feature_key, Feature.t) Hashtbl.t;
        [@of_yojson features_of_yojson]
  }
  [@@deriving of_yojson]
end

module Group = struct
  type name = string [@@deriving of_yojson]
  type id = string [@@deriving of_yojson]
  type meta = { version : string } [@@deriving of_yojson]
  type group_id_or_name = Id of id | Name of name

  let environments_of_yojson =
    Utils.hashtbl_of_yojson Environment.id_of_yojson Environment.of_yojson

  let features_of_yojson =
    Utils.hashtbl_of_yojson Feature.id_of_yojson Feature.of_yojson

  type t = {
    id : id;
    name : name;
    meta : meta;
    environments : (Environment.id, Environment.t) Hashtbl.t;
        [@of_yojson environments_of_yojson]
    features : (Feature.id, Feature.t) Hashtbl.t; [@of_yojson features_of_yojson]
  }
  [@@deriving make, of_yojson]
end

module Manifest = struct
  type group_name = Group.name [@@deriving of_yojson]
  type group_id = Group.id [@@deriving of_yojson]

  type manifest_group = { name : group_name; id : group_id }
  [@@deriving of_yojson]

  type t = { version : string; groups : manifest_group list }
  [@@deriving of_yojson]

  let latest_manifest_version = "1.0"
  let empty = { version = latest_manifest_version; groups = [] }
end
