open Vexilla
open Private

let () =
  let open Alcotest in
  run "Hash"
    [
      ( "hash",
        [
          test_case "should" `Quick (fun () ->
              let seed = 0.32 in
              let actual =
                Hash.hash_instance_id ~seed
                  "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
              in
              let expected = 0.19 in

              (check @@ float epsilon_float) "equal" expected actual);
          test_case "should not" `Quick (fun () ->
              let seed = 0.22 in
              let actual =
                Hash.hash_instance_id ~seed
                  "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
              in
              let expected = 0.943 in

              (check @@ float epsilon_float) "equal" expected actual);
        ] );
    ]
;;
