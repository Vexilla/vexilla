let () =
  let open Alcotest in
  run "Hash"
    [
      ( "hash",
        [
          test_case "should" `Quick (fun () ->
              let seed = 0.11 in
              let actual =
                Vexilla.Hash.hash_instance_id ~seed
                  "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
              in
              let expected = 0.28 in

              check bool "equal" true (actual = expected));
          test_case "should not" `Quick (fun () ->
              let seed = 0.22 in
              let actual =
                Vexilla.Hash.hash_instance_id ~seed
                  "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
              in
              let expected = 0.56 in

              check bool "equal" true (actual = expected));
        ] );
    ]
