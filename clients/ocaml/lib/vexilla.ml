(*
 * let client = Vexilla.make_client {...}
 * let () = Vexilla.sync_manifest client fetcher
 * let () = Vexilla.sync_flags `Gradual fetcher 
 *)

type client = Client.t

let make_client = Client.make
let sync_manifest = Manifest.sync
let sync_flags = Flags.sync
let should = Client.should
let value = Client.value

module Private = struct
  module Client = Client
  module Hash = Hash
  module Schedule = Schedule
  module Types = Types
  module Syntax = Syntax
  module Date_time = Date_time
end
