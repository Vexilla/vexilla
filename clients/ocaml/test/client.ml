open Vexilla
open Private
open Syntax
open Let
module Http_client = Cohttp_lwt_unix.Client

let fetch_hook uri =
  let* _, body = Http_client.get uri in
  let* body_str = Cohttp_lwt.Body.to_string body in
  Lwt.return_ok body_str
;;

let make_client () =
  let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a" in
  let uri = Uri.of_string "http://localhost:3000" in
  Vexilla.make_client ~environment:(`Name "dev") ~instance_id:uuid ~base_url:uri
    ()
;;

let () =
  Lwt_main.run
    (let open Alcotest_lwt in
     run "Client E2E"
       [
         ( "client",
           [
             test_case "Happy path" `Quick (fun _ _ ->
                 let client = make_client () in

                 (* Test that we can successfully sync the manifest *)
                 let* result = Vexilla.sync_manifest ~client ~fetch_hook in
                 let not_error = Result.is_ok result in
                 Alcotest.(
                   check bool "sync_manifest is not an error" true not_error);

                 (* Test that we can successfully sync gradual flags *)
                 let* result =
                   Vexilla.sync_flags ~client ~fetch_hook (Name "Gradual")
                 in

                 let not_error = Result.is_ok result in

                 Alcotest.(
                   check bool "sync_flags is not an error" true not_error);

                 let should_gradual_result =
                   Vexilla.should ~client (`Name "Gradual")
                     (`Name "testingWorkingGradual")
                 in

                 let should_gradual = Result.is_ok should_gradual_result in

                 Alcotest.(
                   check bool "should gradual is not an error" true
                     should_gradual);

                 let should_not_gradual_result =
                   Vexilla.should ~client (`Name "Gradual")
                     (`Name "testingNonWorkingGradual")
                 in

                 let should_not_gradual =
                   Result.is_error should_not_gradual_result
                 in

                 Alcotest.(
                   check bool
                     "should gradual is an error when called with \
                      testingNonWorkingGradual"
                     false should_not_gradual);

                 let* selective_group_result =
                   Vexilla.sync_flags ~client ~fetch_hook (Name "Selective")
                 in

                 let not_error = Result.is_ok selective_group_result in

                 Alcotest.(
                   check bool "selective group result should not be an error"
                     true not_error);

                 let should_selective_string_result =
                   Vexilla.should ~client (`Name "Selective") (`Name "String")
                 in

                 let should_selective_string =
                   Result.is_ok should_selective_string_result
                 in

                 Alcotest.(
                   check bool "should selective string is not an error" true
                     should_selective_string);

                 let should_selective_custom_string_result =
                   Vexilla.should ~client
                     ~instance_id:(`String "shouldBeInList") (`Name "Selective")
                     (`Name "String")
                 in

                 let should_selective_custom_string =
                   Result.is_ok should_selective_custom_string_result
                 in

                 Alcotest.(
                   check bool "should selective custom string is not an error"
                     true should_selective_custom_string);

                 let should_not_selective_custom_string_result =
                   Vexilla.should ~client
                     ~instance_id:(`String "shouldNOTBeInList")
                     (`Name "Selective") (`Name "String")
                 in

                 let should_selective_custom_string =
                   Result.is_ok should_not_selective_custom_string_result
                 in

                 Alcotest.(
                   check bool "should selective custom string is not an error"
                     true should_selective_custom_string);

                 Alcotest.(
                   check bool
                     "should not selective custom string result should be false"
                     false
                     (Result.get_ok should_not_selective_custom_string_result));

                 let should_selective_int_result =
                   Vexilla.should ~client ~instance_id:(`Int 42)
                     (`Name "Selective") (`Name "Number")
                 in

                 let should_selective_int =
                   Result.is_ok should_selective_int_result
                 in

                 Alcotest.(
                   check bool "should selective int is not an error" true
                     should_selective_int);

                 let* value_group_result =
                   Vexilla.sync_flags ~client ~fetch_hook (Name "Value")
                 in

                 let not_error = Result.is_ok value_group_result in

                 Alcotest.(
                   check bool "value group result should not be an error" true
                     not_error);

                 let value_string_result =
                   Vexilla.value ~client ~default:(String "")
                     ~group_key:(`Name "Value") ~feature_key:(`Name "String")
                 in

                 let value_string = Result.is_ok value_string_result in

                 Alcotest.(
                   check bool "value string is not an error" true value_string);

                 let value =
                   match Result.get_ok value_string_result with
                   | String value -> value
                   | _ -> failwith "value_string_result should be a string"
                 in

                 Alcotest.(check string "value is equal too 'foo'" "foo" value);

                 let value_int_result =
                   Vexilla.value ~client ~default:(Int 0)
                     ~group_key:(`Name "Value") ~feature_key:(`Name "Integer")
                 in

                 let value_int = Result.is_ok value_int_result in

                 Alcotest.(
                   check bool "value int is not an error" true value_int);

                 let value =
                   match Result.get_ok value_int_result with
                   | Int value -> value
                   | _ -> failwith "value_int_result should be an int"
                 in

                 Alcotest.(check int "value is equal too 'foo'" 42 value);

                 let value_float_result =
                   Vexilla.value ~client ~default:(Float 0.42)
                     ~group_key:(`Name "Value") ~feature_key:(`Name "Float")
                 in

                 let value_float = Result.is_ok value_float_result in

                 Alcotest.(
                   check bool "value float is not an error" true value_float);

                 let value =
                   match Result.get_ok value_float_result with
                   | Float value -> value
                   | _ -> failwith "value_float_result should be an float"
                 in

                 Alcotest.(
                   check bool "value is equal too 42.42" true
                     (Float.equal 42.42 value));

                 let* scheduled_group_result =
                   Vexilla.sync_flags ~client ~fetch_hook (Name "Scheduled")
                 in

                 let not_error = Result.is_ok scheduled_group_result in

                 Alcotest.(
                   check bool "scheduled group result should not be an error"
                     true not_error);

                 let should_before_global_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "beforeGlobal")
                 in

                 let should_before_global =
                   Result.is_ok should_before_global_result
                 in

                 Alcotest.(
                   check bool "should scheduled beforeGlobal is not an error"
                     true should_before_global);

                 Alcotest.(
                   check bool "should scheduled beforeGlobal should be false"
                     false
                     (Result.get_ok should_before_global_result));

                 let should_during_global_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "duringGlobal")
                 in

                 let should_during_global =
                   Result.is_ok should_during_global_result
                 in

                 Alcotest.(
                   check bool "should scheduled duringGlobal is not an error"
                     true should_during_global);

                 Alcotest.(
                   check bool "should scheduled duringGlobal should be true"
                     true
                     (Result.get_ok should_during_global_result));

                 let should_after_global_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "afterGlobal")
                 in

                 let should_after_global =
                   Result.is_ok should_after_global_result
                 in

                 Alcotest.(
                   check bool "should scheduled afterGlobal is not an error"
                     true should_after_global);

                 Alcotest.(
                   check bool "should scheduled afterGlobal should be false"
                     false
                     (Result.get_ok should_after_global_result));

                 let should_before_global_start_end_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "beforeGlobalStartEnd")
                 in

                 let should_before_global_start_end =
                   Result.is_ok should_before_global_start_end_result
                 in

                 Alcotest.(
                   check bool
                     "should scheduled beforeGlobalStartEnd is not an error"
                     true should_before_global_start_end);

                 Alcotest.(
                   check bool
                     "should scheduled beforeGlobalStartEnd should be false"
                     false
                     (Result.get_ok should_before_global_start_end_result));

                 let should_during_global_start_end_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "duringGlobalStartEnd")
                 in

                 let should_during_global_start_end =
                   Result.is_ok should_during_global_start_end_result
                 in

                 Alcotest.(
                   check bool
                     "should scheduled duringGlobalStartEnd is not an error"
                     true should_during_global_start_end);

                 Alcotest.(
                   check bool
                     "should scheduled duringGlobalStartEnd should be true" true
                     (Result.get_ok should_during_global_start_end_result));

                 let should_after_global_start_end_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "afterGlobalStartEnd")
                 in

                 let should_after_global_start_end =
                   Result.is_ok should_after_global_start_end_result
                 in

                 Alcotest.(
                   check bool
                     "should scheduled afterGlobalStartEnd is not an error" true
                     should_after_global_start_end);

                 Alcotest.(
                   check bool
                     "should scheduled afterGlobalStartEnd should be false"
                     false
                     (Result.get_ok should_after_global_start_end_result));

                 let should_before_global_daily_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "beforeGlobalDaily")
                 in

                 let should_before_global_daily =
                   Result.is_ok should_before_global_daily_result
                 in

                 Alcotest.(
                   check bool
                     "should scheduled beforeGlobalDaily is not an error" true
                     should_before_global_daily);

                 Alcotest.(
                   check bool
                     "should scheduled beforeGlobalDaily should be false" false
                     (Result.get_ok should_before_global_daily_result));

                 let should_during_global_daily_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "duringGlobalDaily")
                 in

                 let should_during_global_daily =
                   Result.is_ok should_during_global_daily_result
                 in

                 Alcotest.(
                   check bool
                     "should scheduled duringGlobalDaily is not an error" true
                     should_during_global_daily);

                 Alcotest.(
                   check bool
                     "should scheduled duringGlobalDaily should be true" true
                     (Result.get_ok should_during_global_daily_result));

                 let should_after_global_daily_result =
                   Vexilla.should ~client (`Name "Scheduled")
                     (`Name "afterGlobalDaily")
                 in

                 (let should_after_global_daily =
                    Result.is_ok should_after_global_daily_result
                  in

                  Alcotest.(
                    check bool
                      "should scheduled afterGlobalDaily is not an error" true
                      should_after_global_daily);

                  Alcotest.(
                    check bool
                      "should scheduled afterGlobalDaily should be false" false
                      (Result.get_ok should_after_global_daily_result)))
                 |> Lwt.return);
           ] );
       ])
;;
