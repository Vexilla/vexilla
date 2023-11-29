open Syntax
open Let

let hashtbl_of_yojson key_of_yojson value_of_yojson = function
  | `Assoc list ->
      let tbl = Hashtbl.create (List.length list) in
      let populated_tbl =
        List.fold_left
          (fun acc ((key : string), (value : Yojson.Safe.t)) ->
            match acc with
            | Error _ -> acc
            | Ok tbl ->
                let@ deserialized_key = key_of_yojson (`String key) in
                let@ deserialized_value = value_of_yojson value in
                Hashtbl.add tbl deserialized_key deserialized_value;
                Ok tbl)
          (Ok tbl) list
      in
      populated_tbl
  | _ -> Error "Invalid feature table"
