open Syntax
open Let
include Ptime

type t = Ptime.t

let of_yojson json =
  match json with
  | `Int f ->
      let@ date_time =
        f |> float_of_int
        |> fun x ->
        x /. 1000. |> Ptime.of_float_s
        |> Option.to_result ~none:"Invalid date time while parsing json"
      in
      Ok date_time
  | _ -> Error "Invalid date time while parsing json"
;;

let make_date_with_time ?(time = ((0, 0, 0), 0)) t =
  let year, month, day = Ptime.to_date t in
  ((year, month, day), time)
;;

let of_span_exn span = Ptime.of_span span |> Option.get
let add_span_exn t span = Ptime.add_span t span |> Option.get
let sub_span_exn t span = Ptime.sub_span t span |> Option.get
let to_seconds_exn t = Ptime.to_span t |> Ptime.Span.to_int_s |> Option.get
let start_of_day t = make_date_with_time t |> Ptime.of_date_time

let end_of_day t =
  make_date_with_time t ~time:((23, 59, 59), 0) |> Ptime.of_date_time
;;

let start_of_day_res t =
  make_date_with_time t |> Ptime.of_date_time
  |> Option.to_result ~none:`Invalid_date
;;

let end_of_day_res t =
  make_date_with_time t ~time:((23, 59, 59), 0)
  |> Ptime.of_date_time
  |> Option.to_result ~none:`Invalid_date
;;

let to_seconds_res t =
  Ptime.to_span t |> Ptime.Span.to_int_s |> Option.to_result ~none:`Invalid_date
;;

module Constants = struct
  let epoch = Ptime.epoch
  let one_day_seconds = 86400
  let one_hour_seconds = 3600
  let one_day_span = Ptime.Span.of_int_s one_day_seconds
  let one_hour_span = Ptime.Span.of_int_s one_hour_seconds
end

module Span = struct
  include Ptime.Span

  let mul_by_int int span =
    Ptime.Span.(span |> to_int_s |> Option.get |> Int.mul int |> of_int_s)
  ;;

  let to_seconds_exn span = to_int_s span |> Option.get
  let of_hours hours = of_int_s (hours * Constants.one_hour_seconds)
  let of_seconds = of_int_s
end

module Clock = Ptime_clock
