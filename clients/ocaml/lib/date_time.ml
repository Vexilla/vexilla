open Syntax
open Let
include Ptime

type t = Ptime.t

let of_yojson json =
  match json with
  | `Int f ->
      let@ date_time =
        f |> float_of_int |> fun x ->
        x /. 1000. |> Ptime.of_float_s
        |> Option.to_result ~none:"Invalid date time while parsing json"
      in
      Ok date_time
  | _ -> Error "Invalid date time while parsing json"

module Clock = Ptime_clock
