(* open Vexilla.Syntax
   open Let
   module Http_client = Cohttp_lwt_unix.Client

   let fetch uri =
     let* response, body = Http_client.get uri in
     Lwt.return ()

   let make_client () =
     let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a" in
     let uri = Uri.of_string "http://localhost:3000" in
     Vexilla.Client.make ~environment:(`Name "dev") ~instance_id:uuid ~base_url:uri
       ()

   let () =
     let open Alcotest in
     run "Client E2E"
       [
         ( "client",
           [
             test_case "test" `Quick (fun () ->
                 let client = make_client () in

                 Vexilla.Manifest.sync ~client check bool "equal" true true);
           ] );
       ] *)
