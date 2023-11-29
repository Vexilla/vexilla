open Vexilla

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
                Types.Schedule.make ~start:zero ~end':zero ~timezone:Utc
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
        ] );
    ]
