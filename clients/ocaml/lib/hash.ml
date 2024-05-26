open Stdint

let fnv32_offset_basis = 2166136261
let fnv32_prime = 16777619

let hash_instance_id ~seed instance_id =
  let _seed = seed in
  let seeded =
    Bytes.of_string instance_id
    |> Bytes.fold_left
         (fun acc byte ->
           let ubyte = Uint32.of_int (Char.code byte) in
           let uacc = Uint32.of_int acc in
           let xord = Uint32.logxor uacc ubyte in
           Uint32.mul xord (Uint32.of_int fnv32_prime) |> Uint32.to_int)
         fnv32_offset_basis
    |> Int.to_float |> Float.mul seed |> Float.to_int
  in
  let remainder = Int.rem seeded 1000 |> Int.to_float in
  Float.div remainder 1000.0
;;
