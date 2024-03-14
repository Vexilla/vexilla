open Vexilla
open Private

let one_day_s = Ptime.Span.of_int_s 86400
let one_hour_s = Ptime.Span.of_int_s 3600
let zero = Ptime.of_float_s 0.0 |> Option.get

let () =
  let open Alcotest in
  run "Schedule"
    [
      ( "is_schedule_active",
        [
          test_case "no schedule" `Quick (fun () ->
              let schedule =
                Private.Types.Schedule.make ~start:zero ~end':zero ~timezone:Utc
                  ~time_type:None ~start_time:zero ~end_time:zero
              in
              let expected = true in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Empty
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule start end - before" `Quick (fun () ->
              let today = Ptime_clock.now () in
              let tomorrow = Ptime.add_span today one_day_s |> Option.get in
              let two_days_from_now =
                Ptime.add_span today (Ptime.Span.add one_day_s one_day_s)
                |> Option.get
              in
              let schedule =
                Types.Schedule.make ~start:tomorrow ~end':two_days_from_now
                  ~timezone:Utc ~time_type:Start_end ~start_time:zero
                  ~end_time:zero
              in
              let expected = false in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule start end - during" `Quick (fun () ->
              let today = Ptime_clock.now () in
              let yesterday = Ptime.sub_span today one_day_s |> Option.get in
              let tomorrow = Ptime.add_span today one_day_s |> Option.get in
              let schedule =
                Types.Schedule.make ~start:yesterday ~end':tomorrow
                  ~timezone:Utc ~time_type:Start_end ~start_time:zero
                  ~end_time:zero
              in
              let expected = true in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule start end - after" `Quick (fun () ->
              let today = Ptime_clock.now () in
              let yesterday = Ptime.sub_span today one_day_s |> Option.get in
              let two_days_ago = Ptime.add_span today one_day_s |> Option.get in
              let schedule =
                Types.Schedule.make ~start:two_days_ago ~end':yesterday
                  ~timezone:Utc ~time_type:Start_end ~start_time:zero
                  ~end_time:zero
              in
              let expected = false in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule active daily - before whole schedule" `Quick
            (fun () ->
              let today = Ptime_clock.now () in
              let tomorrow = Ptime.add_span today one_day_s |> Option.get in
              let two_days_from_now =
                Ptime.add_span today one_day_s |> Option.get
              in
              let schedule =
                Types.Schedule.make ~start:tomorrow ~end':two_days_from_now
                  ~timezone:Utc ~time_type:Daily ~start_time:zero ~end_time:zero
              in
              let expected = false in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule active daily - before day schedule" `Quick
            (fun () ->
              let today = Ptime_clock.now () in
              let yesterday = Ptime.sub_span today one_day_s |> Option.get in
              let tomorrow = Ptime.add_span today one_day_s |> Option.get in
              let start_time = Ptime.add_span today one_hour_s |> Option.get in
              let end_time =
                Ptime.add_span today (Ptime.Span.add one_hour_s one_hour_s)
                |> Option.get
              in
              let schedule =
                Types.Schedule.make ~start:yesterday ~end':tomorrow
                  ~timezone:Utc ~time_type:Daily ~start_time ~end_time
              in
              let expected = false in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule active daily - during day schedule" `Quick
            (fun () ->
              let today = Ptime_clock.now () in
              let yesterday = Ptime.sub_span today one_day_s |> Option.get in
              let tomorrow = Ptime.add_span today one_day_s |> Option.get in
              let start_time = Ptime.sub_span today one_hour_s |> Option.get in
              let end_time = Ptime.add_span today one_hour_s |> Option.get in
              let schedule =
                Types.Schedule.make ~start:yesterday ~end':tomorrow
                  ~timezone:Utc ~time_type:Daily ~start_time ~end_time
              in
              let expected = true in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule active daily - after day schedule" `Quick
            (fun () ->
              let today = Ptime_clock.now () in
              let yesterday = Ptime.sub_span today one_day_s |> Option.get in
              let tomorrow = Ptime.add_span today one_day_s |> Option.get in
              let start_time =
                Ptime.sub_span today (Ptime.Span.add one_hour_s one_hour_s)
                |> Option.get
              in
              let end_time = Ptime.sub_span today one_hour_s |> Option.get in
              let schedule =
                Types.Schedule.make ~start:yesterday ~end':tomorrow
                  ~timezone:Utc ~time_type:Daily ~start_time ~end_time
              in
              let expected = false in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "schedule active daily - after whole schedule" `Quick
            (fun () ->
              let today = Ptime_clock.now () in
              let two_days_ago =
                Ptime.sub_span today (Ptime.Span.add one_day_s one_day_s)
                |> Option.get
              in
              let yesterday = Ptime.sub_span today one_day_s |> Option.get in
              let schedule =
                Types.Schedule.make ~start:two_days_ago ~end':yesterday
                  ~timezone:Utc ~time_type:Daily ~start_time:zero ~end_time:zero
              in
              let expected = false in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Global
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "24 hour active start end single day" `Quick (fun () ->
              let date = Ptime.to_date (Ptime_clock.now ()) in
              let _ =
                List.init 24 Fun.id
                |> List.iter (fun hour ->
                       let mocked_now =
                         Date_time.of_date_time (date, ((0, hour, 0), 0))
                         |> Option.get
                       in
                       let before_schedule =
                         Types.Schedule.make ~start:mocked_now ~end':mocked_now
                           ~timezone:Utc ~time_type:Start_end
                           ~start_time:
                             Date_time.(
                               add_span_exn epoch (Span.of_hours (hour + 1)))
                           ~end_time:
                             Date_time.(
                               add_span_exn epoch (Span.of_hours (hour + 3)))
                       in
                       let is_before_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:before_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_before_schedule_active is false for hour: %d"
                            hour)
                         false is_before_schedule_active;
                       let during_schedule =
                         Types.Schedule.make ~start:mocked_now ~end':mocked_now
                           ~timezone:Utc ~time_type:Start_end
                           ~start_time:
                             Date_time.(
                               add_span_exn epoch (Span.of_hours (hour - 1)))
                           ~end_time:
                             Date_time.(
                               add_span_exn epoch (Span.of_hours (hour + 1)))
                       in
                       let () =
                         Fmt.pr "Hour: %d\nSchedule: %s" hour
                           (Types.Schedule.show during_schedule)
                       in
                       let is_during_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:during_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_during_schedule_active is true for hour: %d"
                            hour)
                         true is_during_schedule_active)
              in

              ());
        ] );
    ]
;;
