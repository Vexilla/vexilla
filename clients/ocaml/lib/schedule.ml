open Syntax
open Let

let is_schedule_active_with_now ~schedule ~schedule_type now =
  let open Types.Schedule in
  match schedule_type with
  | Empty -> Ok true
  | Environment | Global -> (
      let@ beginning_of_start_date =
        Date_time.start_of_day_res schedule.start
      in
      let@ ending_of_end_date = Date_time.end_of_day_res schedule.end' in
      if
        Date_time.is_earlier now ~than:beginning_of_start_date
        || Date_time.is_later now ~than:ending_of_end_date
      then Ok false
      else
        let _, start_time = Date_time.to_date_time schedule.start_time in
        let _, end_time = Date_time.to_date_time schedule.end_time in
        match schedule.time_type with
        | None -> Ok true
        | Start_end ->
            let@ start =
              Date_time.(
                of_date_time (to_date beginning_of_start_date, start_time))
              |> Option.to_result ~none:`Invalid_date
            in
            let@ end' =
              Date_time.(of_date_time (to_date ending_of_end_date, end_time))
              |> Option.to_result ~none:`Invalid_date
            in
            let@ now_seconds = Date_time.to_seconds_res now in
            let@ start_seconds = Date_time.to_seconds_res start in
            let@ end_seconds = Date_time.to_seconds_res end' in
            let is_after_start_date_time = now_seconds >= start_seconds in
            let is_before_end_date_time = now_seconds <= end_seconds in
            Ok (is_after_start_date_time && is_before_end_date_time)
        | Daily ->
            let now = Date_time.Clock.now () in
            let@ today_zero_timestamp =
              Date_time.to_date now |> Date_time.of_date
              |> Option.to_result ~none:`Invalid_date
            in
            let@ zeroed_start_timestamp =
              Date_time.(of_date_time (to_date epoch, start_time))
              |> Option.to_result ~none:`Invalid_date
            in
            let@ zeroed_end_timestamp =
              Date_time.(of_date_time (to_date epoch, end_time))
              |> Option.to_result ~none:`Invalid_date
            in
            let zeroed_end_span = Date_time.to_span zeroed_end_timestamp in
            let day_span = Date_time.Span.of_int_s 86400 in
            let@ zeroed_end_timestamp_plus_day =
              Date_time.Span.add zeroed_end_span day_span
              |> Date_time.of_span
              |> Option.to_result ~none:`Invalid_date
            in
            let@ start_timestamp =
              Date_time.(
                Span.add
                  (to_span today_zero_timestamp)
                  (to_span zeroed_start_timestamp)
                |> of_span)
              |> Option.to_result ~none:`Invalid_date
            in
            let@ end_timestamp =
              if
                Date_time.is_later ~than:zeroed_end_timestamp
                  zeroed_start_timestamp
              then
                Date_time.(
                  Span.add
                    (to_span today_zero_timestamp)
                    (to_span zeroed_end_timestamp_plus_day)
                  |> of_span)
                |> Option.to_result ~none:`Invalid_date
              else
                Date_time.(
                  Span.add
                    (to_span today_zero_timestamp)
                    (to_span zeroed_end_timestamp)
                  |> of_span)
                |> Option.to_result ~none:`Invalid_date
            in
            Ok
              Date_time.(
                to_float_s now > to_float_s start_timestamp
                && to_float_s now < to_float_s end_timestamp))
;;

let is_schedule_active ~schedule ~schedule_type =
  is_schedule_active_with_now ~schedule ~schedule_type (Date_time.Clock.now ())
;;

let is_schedule_feature_active (feature : Types.Feature.t) =
  let attributes = Types.Feature.attributes feature in
  is_schedule_active ~schedule:attributes.schedule
    ~schedule_type:attributes.schedule_type
;;
