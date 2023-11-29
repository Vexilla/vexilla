module type S = sig
  type key
  type value
  type t

  val find : key:key -> t -> value option
  val has : key:key -> t -> bool
  val make : ?size:int -> unit -> t
  val remove : key:key -> t -> t
  val set : key:key -> value:value -> t -> t
end

module Base = struct
  module type S = sig
    type key
    type value
  end
end

module By_id_or_name = struct
  module type S = sig
    type id
    type name
  end
end

module Make (M : Base.S) : S with type key = M.key and type value = M.value =
struct
  type key = M.key
  type value = M.value
  type t = (key, value) Hashtbl.t

  let find ~key t = Hashtbl.find_opt t key
  let has ~key t = Hashtbl.mem t key
  let make ?(size = 10) () = Hashtbl.create size

  let remove ~key t =
    let () = Hashtbl.remove t key in
    t

  let set ~key ~value t =
    let () = Hashtbl.replace t key value in
    t
end

module Make_by_id_or_name (M : By_id_or_name.S) :
  S with type key = [ `Id of M.id | `Name of M.name ] and type value = M.id =
struct
  type key = [ `Id of M.id | `Name of M.name ]
  type value = M.id
  type t = (key, value) Hashtbl.t

  let find ~key t = Hashtbl.find_opt t key
  let has ~key t = Hashtbl.mem t key
  let make ?(size = 10) () = Hashtbl.create size

  let remove ~key t =
    let () = Hashtbl.remove t key in
    t

  let set ~key ~value t =
    let () = Hashtbl.replace t key value in
    t
end

module Group_table = Make_by_id_or_name (Types.Group)

module Feature_table = struct
  include Make_by_id_or_name (Types.Feature)

  let set_feature ~feature feature_table =
    let open Types.Feature in
    let { id; name; _ } = attributes feature in
    feature_table
    |> set ~key:(`Id id) ~value:id
    |> set ~key:(`Name name) ~value:id
end

module Environment_table = struct
  include Make_by_id_or_name (Types.Environment)

  let set_environment ~environment environment_table =
    let open Types.Environment in
    let { id; name; _ } = environment in
    environment_table
    |> set ~key:(`Id id) ~value:id
    |> set ~key:(`Name name) ~value:id
end

module Composite_feature_table = Make (struct
  type key = Types.Group.id
  type value = Feature_table.t
end)

module Composite_environment_table = Make (struct
  type key = Types.Group.id
  type value = Environment_table.t
end)
