let hash_instance_id ~seed instance_id =
  let bytes = Bytes.of_string instance_id in
  let total =
    Bytes.fold_left
      (fun acc byte -> Float.(byte |> Char.code |> of_int |> add acc))
      0.0 bytes
  in
  let base = total *. seed *. 42.0 in
  Float.(rem (trunc base) 100.0 |> (Fun.flip div) 100.0)
