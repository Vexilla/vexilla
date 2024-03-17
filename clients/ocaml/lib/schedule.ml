open Syntax
open Let

let is_schedule_active_with_now ~schedule ~schedule_type now =
  let open Types.Schedule in
  match schedule_type with
  | Empty -> Ok true
  | Environment | Global -> (
      let@ start_date =
        Date_time.from_ms ~ms:schedule.start
        |> Option.to_result ~none:`Invalid_date
      in
      let@ end_date =
        Date_time.from_ms ~ms:schedule.end'
        |> Option.to_result ~none:`Invalid_date
      in
      let@ start_of_start_date = Date_time.start_of_day_res start_date in
      let@ end_of_end_date = Date_time.end_of_day_res end_date in
      if
        Date_time.is_earlier now ~than:start_of_start_date
        || Date_time.is_later now ~than:end_of_end_date
      then Ok false
      else
        let@ start_date_ptime =
          Date_time.from_ms ~ms:schedule.start_time
          |> Option.to_result ~none:`Invalid_date
        in
        let _, start_time = Date_time.to_date_time start_date_ptime in
        let@ end_date_ptime =
          Date_time.from_ms ~ms:schedule.end_time
          |> Option.to_result ~none:`Invalid_date
        in
        let _, end_time = Date_time.to_date_time end_date_ptime in
        match schedule.time_type with
        | None -> Ok true
        | Start_end ->
            let@ start_of_start_date_ms =
              Date_time.to_ms_res start_of_start_date
            in
            let@ start_of_end_date = Date_time.start_of_day_res end_date in
            let@ start_of_end_date_ms = Date_time.to_ms_res start_of_end_date in
            let@ now_ms = Date_time.to_ms_res now in

            let is_after_start_date_time =
              now_ms >= start_of_start_date_ms + schedule.start_time
            in
            let is_before_end_date_time =
              now_ms <= start_of_end_date_ms + schedule.end_time
            in
            Ok (is_after_start_date_time && is_before_end_date_time)
        | Daily ->
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
            let@ start_timestamp =
              Date_time.(
                Span.add
                  (to_span today_zero_timestamp)
                  (to_span zeroed_start_timestamp)
                |> of_span)
              |> Option.to_result ~none:`Invalid_date
            in
            let@ end_timestamp =
              Date_time.(
                Span.add
                  (to_span today_zero_timestamp)
                  (to_span zeroed_end_timestamp)
                |> of_span)
              |> Option.to_result ~none:`Invalid_date
            in
            if
              Date_time.is_later ~than:zeroed_end_timestamp
                zeroed_start_timestamp
            then
              Ok
                Date_time.(
                  to_float_s now >= to_float_s start_timestamp
                  || to_float_s now <= to_float_s end_timestamp)
            else
              Ok
                Date_time.(
                  to_float_s now >= to_float_s start_timestamp
                  && to_float_s now <= to_float_s end_timestamp))
;;

let is_schedule_active ~schedule ~schedule_type =
  is_schedule_active_with_now ~schedule ~schedule_type (Date_time.Clock.now ())
;;

let is_schedule_feature_active (feature : Types.Feature.t) =
  let attributes = Types.Feature.attributes feature in
  is_schedule_active ~schedule:attributes.schedule
    ~schedule_type:attributes.schedule_type
;;
