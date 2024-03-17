open Vexilla
open Private

let () =
  let open Alcotest in
  run "Schedule"
    [
      ( "is_schedule_active",
        [
          test_case "no schedule" `Quick (fun () ->
              let schedule =
                Private.Types.Schedule.make ~start:0 ~end':0 ~timezone:Utc
                  ~time_type:None ~start_time:0 ~end_time:0
              in
              let expected = true in
              let actual =
                Schedule.is_schedule_active ~schedule ~schedule_type:Empty
                |> Result.value ~default:false
              in
              check bool "equal" expected actual);
          test_case "start end single day" `Quick (fun () ->
              let date = Ptime.to_date (Ptime_clock.now ()) in
              let _ =
                List.init 24 Fun.id
                |> List.iter (fun hour ->
                       (* NOTE for dmmulroy: This was (0, hour, 0) which would be 12:02:00AM rather than 2:00:00AM. Easy mistake to make, but if I don't make a note, I will forget to let him know how we fixed this test *)
                       let mocked_now =
                         Date_time.of_date_time (date, ((hour, 0, 0), 0))
                         |> Option.get
                       in
                       let mocked_now_ms = Date_time.to_ms_exn mocked_now in
                       let before_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 3))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_schedule =
                         Types.Schedule.make ~start:mocked_now_ms
                           ~end':mocked_now_ms ~timezone:Utc
                           ~time_type:Start_end ~start_time:before_start_time_ms
                           ~end_time:before_end_time_ms
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
                       let during_start_time =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_end_time =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_schedule =
                         Types.Schedule.make ~start:mocked_now_ms
                           ~end':mocked_now_ms ~timezone:Utc
                           ~time_type:Start_end ~start_time:during_start_time
                           ~end_time:during_end_time
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
                         true is_during_schedule_active;

                       let after_start_time =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_end_time =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_schedule =
                         Types.Schedule.make ~start:mocked_now_ms
                           ~end':mocked_now_ms ~timezone:Utc
                           ~time_type:Start_end ~start_time:after_start_time
                           ~end_time:after_end_time
                       in
                       let is_after_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:after_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_after_schedule_active is true for hour: %d" hour)
                         false is_after_schedule_active)
              in

              ());
          test_case "start end multi day" `Quick (fun () ->
              let date = Ptime.to_date (Ptime_clock.now ()) in
              let _ =
                List.init 24 Fun.id
                |> List.iter (fun hour ->
                       let mocked_now =
                         Date_time.of_date_time (date, ((hour, 0, 0), 0))
                         |> Option.get
                       in

                       let before_start_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days 1)
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_end_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days 3)
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 3))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_schedule =
                         Types.Schedule.make ~start:before_start_date_ms
                           ~end':before_end_date_ms ~timezone:Utc
                           ~time_type:Start_end ~start_time:before_start_time_ms
                           ~end_time:before_end_time_ms
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

                       let during_start_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_end_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days 1))
                         |> Date_time.to_ms_exn
                       in
                       let during_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_schedule =
                         Types.Schedule.make ~start:during_start_date_ms
                           ~end':during_end_date_ms ~timezone:Utc
                           ~time_type:Start_end ~start_time:during_start_time_ms
                           ~end_time:during_end_time_ms
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
                         true is_during_schedule_active;

                       let after_start_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_end_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-1)))
                         |> Date_time.to_ms_exn
                       in

                       let after_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_schedule =
                         Types.Schedule.make ~start:after_start_date_ms
                           ~end':after_end_date_ms ~timezone:Utc
                           ~time_type:Start_end ~start_time:after_start_time_ms
                           ~end_time:after_end_time_ms
                       in
                       let is_after_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:after_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_after_schedule_active is true for hour: %d" hour)
                         false is_after_schedule_active)
              in

              ());
          test_case "daily single day" `Quick (fun () ->
              let date = Ptime.to_date (Ptime_clock.now ()) in
              let _ =
                List.init 24 Fun.id
                |> List.iter (fun hour ->
                       let mocked_now =
                         Date_time.of_date_time (date, ((hour, 0, 0), 0))
                         |> Option.get
                       in

                       let mocked_now_ms = Date_time.to_ms_exn mocked_now in

                       let before_whole_start_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days 1)
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_end_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days 1)
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 3))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_schedule =
                         Types.Schedule.make ~start:before_whole_start_date_ms
                           ~end':before_whole_end_date_ms ~timezone:Utc
                           ~time_type:Daily
                           ~start_time:before_whole_start_time_ms
                           ~end_time:before_whole_end_time_ms
                       in
                       let is_before_whole_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:before_whole_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_before_whole_schedule_active is false for \
                             hour: %d"
                            hour)
                         false is_before_whole_schedule_active;

                       let before_day_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_day_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 3))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_day_schedule =
                         Types.Schedule.make ~start:mocked_now_ms
                           ~end':mocked_now_ms ~timezone:Utc ~time_type:Daily
                           ~start_time:before_day_start_time_ms
                           ~end_time:before_day_end_time_ms
                       in
                       let is_before_day_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:before_day_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_before_day_schedule_active is false for hour: \
                             %d"
                            hour)
                         false is_before_day_schedule_active;

                       let during_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_schedule =
                         Types.Schedule.make ~start:mocked_now_ms
                           ~end':mocked_now_ms ~timezone:Utc ~time_type:Daily
                           ~start_time:during_start_time_ms
                           ~end_time:during_end_time_ms
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
                         true is_during_schedule_active;

                       let after_day_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_day_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_day_schedule =
                         Types.Schedule.make ~start:mocked_now_ms
                           ~end':mocked_now_ms ~timezone:Utc ~time_type:Daily
                           ~start_time:after_day_start_time_ms
                           ~end_time:after_day_end_time_ms
                       in
                       let is_after_day_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:after_day_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_after_day_schedule_active is true for hour: %d"
                            hour)
                         false is_after_day_schedule_active;

                       let after_whole_start_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_whole_end_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-1)))
                         |> Date_time.to_ms_exn
                       in

                       let after_whole_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_whole_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_whole_schedule =
                         Types.Schedule.make ~start:after_whole_start_date_ms
                           ~end':after_whole_end_date_ms ~timezone:Utc
                           ~time_type:Daily
                           ~start_time:after_whole_start_time_ms
                           ~end_time:after_whole_end_time_ms
                       in
                       let is_after_whole_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:after_whole_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_after_whole_schedule_active is true for hour: \
                             %d"
                            hour)
                         false is_after_whole_schedule_active)
              in

              ());
          test_case "daily multi day" `Quick (fun () ->
              let date = Ptime.to_date (Ptime_clock.now ()) in
              let _ =
                List.init 24 Fun.id
                |> List.iter (fun hour ->
                       let mocked_now =
                         Date_time.of_date_time (date, ((hour, 0, 0), 0))
                         |> Option.get
                       in

                       let before_whole_start_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days 1)
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_end_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days 3)
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 3))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_whole_schedule =
                         Types.Schedule.make ~start:before_whole_start_date_ms
                           ~end':before_whole_end_date_ms ~timezone:Utc
                           ~time_type:Daily
                           ~start_time:before_whole_start_time_ms
                           ~end_time:before_whole_end_time_ms
                       in
                       let is_before_whole_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:before_whole_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_before_whole_schedule_active is false for \
                             hour: %d"
                            hour)
                         false is_before_whole_schedule_active;

                       let before_day_start_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days (-1))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_day_end_date_ms =
                         Date_time.(
                           add_span_exn mocked_now (Span.of_days 1)
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_day_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_day_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 3))
                           |> to_seconds_exn)
                         |> Int.mul 1000
                       in
                       let before_day_schedule =
                         Types.Schedule.make ~start:before_day_start_date_ms
                           ~end':before_day_end_date_ms ~timezone:Utc
                           ~time_type:Daily ~start_time:before_day_start_time_ms
                           ~end_time:before_day_end_time_ms
                       in
                       let is_before_day_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:before_day_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_before_day_schedule_active is false for hour: \
                             %d"
                            hour)
                         false is_before_day_schedule_active;

                       let during_start_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_end_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days 1))
                         |> Date_time.to_ms_exn
                       in
                       let during_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour + 1)))
                         |> Date_time.to_ms_exn
                       in
                       let during_schedule =
                         Types.Schedule.make ~start:during_start_date_ms
                           ~end':during_end_date_ms ~timezone:Utc
                           ~time_type:Daily ~start_time:during_start_time_ms
                           ~end_time:during_end_time_ms
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
                         true is_during_schedule_active;

                       let after_day_start_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_day_end_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days 1))
                         |> Date_time.to_ms_exn
                       in

                       let after_day_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_day_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_day_schedule =
                         Types.Schedule.make ~start:after_day_start_date_ms
                           ~end':after_day_end_date_ms ~timezone:Utc
                           ~time_type:Daily ~start_time:after_day_start_time_ms
                           ~end_time:after_day_end_time_ms
                       in
                       let is_after_day_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:after_day_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_after_day_schedule_active is true for hour: %d"
                            hour)
                         false is_after_day_schedule_active;

                       let after_whole_start_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_whole_end_date_ms =
                         Date_time.(add_span_exn mocked_now (Span.of_days (-1)))
                         |> Date_time.to_ms_exn
                       in

                       let after_whole_start_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 3)))
                         |> Date_time.to_ms_exn
                       in
                       let after_whole_end_time_ms =
                         Date_time.(
                           add_span_exn epoch (Span.of_hours (hour - 1)))
                         |> Date_time.to_ms_exn
                       in
                       let after_whole_schedule =
                         Types.Schedule.make ~start:after_whole_start_date_ms
                           ~end':after_whole_end_date_ms ~timezone:Utc
                           ~time_type:Daily
                           ~start_time:after_whole_start_time_ms
                           ~end_time:after_whole_end_time_ms
                       in
                       let is_after_whole_schedule_active =
                         Schedule.is_schedule_active_with_now
                           ~schedule:after_whole_schedule ~schedule_type:Global
                           mocked_now
                         |> Result.get_ok
                       in
                       check bool
                         (Fmt.str
                            "is_after_whole_schedule_active is true for hour: \
                             %d"
                            hour)
                         false is_after_whole_schedule_active)
              in

              ());
        ] );
    ]
;;
