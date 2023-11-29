val hashtbl_of_yojson : 
  (Yojson.Safe.t -> ('key, string) result) -> 
  (Yojson.Safe.t -> ('value, string) result) -> 
  Yojson.Safe.t -> 
  (('key, 'value) Hashtbl.t, string) result
