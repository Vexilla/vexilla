open Vexilla

let capture_diagnostics action =
  let original_stderr = Unix.dup Unix.stderr in
  let reader, writer = Unix.pipe () in
  Unix.dup2 writer Unix.stderr;
  Unix.close writer;
  let restore () =
    Format.pp_print_flush Format.err_formatter ();
    Unix.dup2 original_stderr Unix.stderr;
    Unix.close original_stderr
  in
  (try
     action ();
     restore ()
   with error ->
     restore ();
     raise error);
  let input = Unix.in_channel_of_descr reader in
  let diagnostics = Buffer.create 128 in
  (try
     while true do
       Buffer.add_string diagnostics (input_line input);
       Buffer.add_char diagnostics '\n'
     done
   with End_of_file -> ());
  close_in input;
  Buffer.contents diagnostics
;;

let test_logging () =
  List.iter
    (fun show_logs ->
      let diagnostics =
        capture_diagnostics (fun () ->
            let client =
              make_client ~show_logs ~environment:(`Id "prod")
                ~base_url:(Uri.of_string "https://private-token@contract")
                ~instance_id:"private-instance" ()
            in
            let manifest =
              match
                Lwt_main.run
                  (get_manifest ~client ~fetch_hook:(fun _ ->
                       Lwt.return_ok "{\"version\":\"v1\",\"groups\":[]}"))
              with
              | Ok manifest -> manifest
              | Error _ -> failwith "Fetch rejected valid manifest"
            in
            let client =
              match set_manifest ~client manifest with
              | Ok client -> client
              | Error _ -> failwith "Installation rejected valid manifest"
            in
            let fetch_result =
              Lwt_main.run
                (get_manifest ~client ~fetch_hook:(fun _ ->
                     Lwt.return_error (`Msg "private-callback-error")))
            in
            if not (Result.is_error fetch_result) then
              failwith "Fetch failure was swallowed";
            let invalid_manifest = { manifest with version = "invalid" } in
            if not (Result.is_error (set_manifest ~client invalid_manifest))
            then failwith "Validation failure was swallowed")
      in
      if show_logs then (
        List.iter
          (fun expected ->
            let pattern = Str.regexp_string expected in
            let contains =
              try
                ignore (Str.search_forward pattern diagnostics 0);
                true
              with Not_found -> false
            in
            Alcotest.(check bool) expected true contains)
          [
            "manifest.fetch outcome=success";
            "manifest.install outcome=success";
            "manifest.fetch outcome=failure";
            "manifest.install outcome=failure";
          ];
        let has_private_data =
          try
            ignore
              (Str.search_forward (Str.regexp_string "private-") diagnostics 0);
            true
          with Not_found -> false
        in
        Alcotest.(check bool) "No private data" false has_private_data)
      else Alcotest.(check string) "Disabled logging" "" diagnostics)
    [ false; true ]
;;

let () =
  Alcotest.run "Diagnostics"
    [
      ( "logging",
        [
          Alcotest.test_case "Opt-in outcomes and preserved failures" `Quick
            test_logging;
        ] );
    ]
;;
