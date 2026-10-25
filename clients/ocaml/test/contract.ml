open Vexilla
open Private
open Yojson.Safe.Util
let root=Option.value(Sys.getenv_opt "VEXILLA_CONTRACT_DIR")~default:"../../.contract-artifacts"
let read name=let c=open_in_bin(Filename.concat root name)in let s=really_input_string c(in_channel_length c)in close_in c;Unicode.parse s
let text key value=member key value |> to_string
let number=function `Int n->float_of_int n|`Float n->n|`Intlit s->float_of_string s|_->failwith "Expected number"
exception Contract_error of string
let result=function
 | Ok v->v
 | Error(`Validation _)->raise(Contract_error "validation")
 | Error(`Fetch _)->raise(Contract_error "fetch")
 | Error(`Flag_group_not_found|`Feature_not_found|`Environment_not_found)->raise(Contract_error "lookup")
 | Error(`Unsupported_should_feature_type _|`Unsupported_value_feature_type)->raise(Contract_error "kind")
 | Error `Invalid_instance_id->raise(Contract_error "instance")
 | Error `Invalid_date->failwith "Unexpected native date narrowing"
let decoded decode raw=match decode raw with Ok v->v|Error _->raise(Contract_error "validation")
let group raw=decoded Types.Group.of_yojson raw
let manifest raw=decoded Types.Manifest.of_yojson raw
let await promise=Lwt_main.run promise |> result
let envelope v=`Assoc["value",v]
let outcome fn=try envelope(fn())with Contract_error kind->`Assoc["error",`String kind]
let unit fn=fn();`Null
let boolean v=`Bool v
let scalar=function Types.Feature.String s->`String s|Int n->`Int n|Float n->`Float n
let instance=function `String s->`String s|`Int n->`Int n|`Float n->`Float n|`Intlit s->`Float(float_of_string s)|`Null->`Missing|_->`Invalid
let default=function `String s->Types.Feature.String s|`Int n->Types.Feature.Int n|n->Types.Feature.Float(number n)
let make env id=make_client ~base_url:(Uri.of_string "https://contract")~environment:(`Id env)~instance_id:""~custom_instance_id:(instance id)()
let fetch uri=Lwt.return_ok(Yojson.Safe.to_string(read(Filename.basename(Uri.path uri))))
let encode raw=try Yojson.Safe.to_string raw with Yojson.Json_error _->raise(Contract_error "validation")
let parse_wire s=try Unicode.parse s with _->raise(Contract_error "validation")
let tokens p=String.sub p 1(String.length p-1)|>String.split_on_char '/'|>List.map(fun s->Str.global_replace(Str.regexp_string "~0")"~"(Str.global_replace(Str.regexp_string "~1")"/"s))
let rec at v=function []->v|k::keys->at(match v with `List xs->List.nth xs(int_of_string k)|_->member k v)keys
let rec update v keys item remove=match keys,v with
 | [key],`List xs->let index=int_of_string key in `List(List.mapi(fun i x->i,x)xs |> List.filter_map(fun(i,x)->if i=index then if remove then None else Some item else Some x) |> fun xs->if not remove && index=List.length xs then xs@[item]else xs)
 | [key],`Assoc fields->`Assoc(if remove then List.remove_assoc key fields else (key,item)::List.remove_assoc key fields)
 | key::rest,`List xs->`List(List.mapi(fun i x->if i=int_of_string key then update x rest item remove else x)xs)
 | key::rest,`Assoc fields->`Assoc(List.map(fun(k,x)->k,if k=key then update x rest item remove else x)fields)
 | _->failwith "Invalid mutation pointer"
let mutate v mutations=List.fold_left(fun v m->let op=text "op" m in
 let item=if op="remove"then `Null else if op="copy"then at v(tokens(text "from" m))else if List.mem_assoc "wireString"(to_assoc m)then parse_wire(text "wireString" m)else if List.mem_assoc "nativeNumber"(to_assoc m)then `Float(match text "nativeNumber" m with "NaN"->nan|"Infinity"->infinity|_->neg_infinity)else member "value" m in
 update v(tokens(text "path" m))item(op="remove"))v mutations
let rec equal a b=match a,b with
 | (`Int _|`Float _|`Intlit _),(`Int _|`Float _|`Intlit _)->number a=number b
 | `Assoc xs,`Assoc ys->List.map fst xs |> List.sort compare = (List.map fst ys |> List.sort compare) && List.for_all(fun(k,v)->equal v(List.assoc k ys))xs
 | `List xs,`List ys->List.length xs=List.length ys && List.for_all2 equal xs ys
 | _->a=b
let observations=ref []
let observe id got want=if not(equal got want)then failwith(id^" expected "^Yojson.Safe.to_string want^" actual "^Yojson.Safe.to_string got);observations:=`Assoc["caseId",`String id;"outcome",got]::!observations
let sample s got=observe(text "id" s)got(member "expected" s)
let expected=read "expected.json"
let parity=read "parity.json"
let sections key=member key parity |> to_list
let group_id=text "groupId" expected
let ()=
 List.iter(fun s->sample s(envelope(`Int(Hash.fnv32a(text "text" s)))))(sections "hashes");
 List.iter(fun s->let formatted=Hash.instance_text(instance(member "instance" s))|>result in sample s(envelope(`Assoc["text",`String formatted;"hash",`Int(Hash.fnv32a formatted)])))(sections "numbers");
 List.iter(fun s->
  let c=await(sync_manifest ~client:(make "prod"(`String "member"))~fetch_hook:fetch)in
  let g=read "contract-group.json" |> fun g->update g["environments";"prod";"features";"gradual";"seed"](member "seed" s)false |> fun g->update g["environments";"prod";"features";"gradual";"value"](member "threshold" s)false in
  let c=await(set_flags ~client:c ~group:(group g))in
  let id=instance(member "instance" s)in let formatted=Hash.instance_text id|>result in
  sample s(envelope(`Assoc["bucket",`Float(Hash.hash_instance_id ~seed:(number(member "seed" s))formatted);"enabled",`Bool(should ~client:c ~instance_id:id(`Id group_id)(`Id "gradual")|>result)])))(sections "gradual");
 List.iter(fun s->let schedule=decoded Types.Schedule.of_yojson(member "schedule" s)in let mode=decoded Types.Schedule.schedule_type_of_yojson(member "scheduleType" s)in sample s(envelope(boolean(Schedule.is_schedule_active_millis ~schedule ~schedule_type:mode(int_of_float(number(member "now" s)))|>result))))(sections "schedules");
 List.iter(fun s->
  let results=List.map(fun fetched->outcome(fun()->
    let source=mutate(`Assoc["manifest",read "manifest.json";"groups",`Assoc[group_id,read "contract-group.json"]])(member "mutations" s|>to_list)in
    let c=make "prod"(`String "member")in
    let c=if fetched then let bytes=encode(member "manifest" source)in await(sync_manifest ~client:c ~fetch_hook:(fun _->Lwt.return_ok bytes))else set_manifest ~client:c(manifest(member "manifest" source))|>result in
    ignore(List.fold_left(fun c(id,g)->if fetched then let bytes=encode g in await(sync_flags ~client:c ~fetch_hook:(fun _->Lwt.return_ok bytes)(Types.Group.Id id))else await(set_flags ~client:c ~group:(group g)))c(to_assoc(member "groups" source)));`Bool true))[false;true]in
  if not(equal(List.hd results)(List.nth results 1))then failwith(text "id" s^" ingestion paths differ: "^Yojson.Safe.to_string(`List results));sample s(List.hd results))(sections "validation");
 List.iter(fun s->let clients=Hashtbl.create 10 and data=Hashtbl.create 10 in
  let results=List.map(fun step->outcome(fun()->
   let key k=text k step in
   let c()=Hashtbl.find clients(key "client")in
   let save c=Hashtbl.replace clients(key "client")c in
   let callback _=let cb=member "callback" step in if member "throws" cb=`Bool true then Lwt.return_error(`Msg "Transport failure")else let raw=if member "file" cb<>`Null then read(text "file" cb)else Hashtbl.find data(text "data" cb)in Lwt.return_ok(Yojson.Safe.to_string raw)in
   match key "op"with
   | "load"->unit(fun()->Hashtbl.replace data(key "as")(read(key "file")))
   | "new"->unit(fun()->save(make(key "environment")(member "instance" step)))
   | "mutate"->unit(fun()->Hashtbl.replace data(key "data")(mutate(Hashtbl.find data(key "data"))(member "mutations" step|>to_list)))
   | "setManifest"->unit(fun()->save(set_manifest ~client:(c())(manifest(Hashtbl.find data(key "data")))|>result))
   | "setFlags"->unit(fun()->save(await(set_flags ~client:(c())~group:(group(Hashtbl.find data(key "data"))))))
   | "getManifest"->unit(fun()->Hashtbl.replace data(key "as")(Types.Manifest.to_yojson(await(get_manifest ~client:(c())~fetch_hook:callback))))
   | "getFlags"->unit(fun()->Hashtbl.replace data(key "as")(Types.Group.to_yojson(await(get_flags ~client:(c())~fetch_hook:callback(Types.Group.Id(key "group"))))))
   | "syncManifest"->unit(fun()->save(await(sync_manifest ~client:(c())~fetch_hook:callback)))
   | "syncFlags"->unit(fun()->save(await(sync_flags ~client:(c())~fetch_hook:callback(Types.Group.Id(key "group")))))
   | "should"->let id=if List.mem_assoc "instance"(to_assoc step)then Some(instance(member "instance" step))else None in boolean(should ~client:(c())?instance_id:id(`Id(key "group"))(`Id(key "feature"))|>result)
   | "value"->scalar(value ~client:(c())~default:(default(member "default" step))~group_key:(`Id(key "group"))~feature_key:(`Id(key "feature"))|>result)
   | _->failwith "Unknown operation"))(member "steps" s|>to_list)in
   sample s(`Assoc["value",`List results]))(sections "operations");
 List.iter(fun s->sample s(envelope(`String(Compatibility.normalize(text "name" s)))))(sections "aliases");
 List.iter(fun s->let g=update(read "contract-group.json")["features";"toggle";"schedule";"timezone"](member "timezone" s)false in let result=outcome(fun()->ignore(group g);`Bool true)in sample s(envelope(`Bool(member "value" result<>`Null))))(sections "timezones");
 List.iter(fun env->List.iter(fun lookup->
  let name id label=match lookup with "id"->id|"name"->label|_->Compatibility.normalize label in
  let c=await(sync_manifest ~client:(make(name(text "id" env)(text "name" env))(`String "member"))~fetch_hook:fetch)in
  let c=await(sync_flags ~client:c ~fetch_hook:fetch(Types.Group.Id group_id))in
  let g=name group_id(text "groupName" expected)in
  List.iteri(fun index s->let fid=name(text "id" s)(text "name" s)in
   let got=outcome(fun()->if text "kind" s="value"then scalar(value ~client:c ~default:(Types.Feature.String "fallback")~group_key:(`Id g)~feature_key:(`Id fid)|>result)else boolean(should ~client:c ~instance_id:(instance(member "instance" s))(`Id g)(`Id fid)|>result))in
   observe(Printf.sprintf "publication/%s/%s/%d"(text "id" env)lookup index)got(envelope(member(text "expectedKey" s)env)))(member "cases" expected|>to_list);
  let decoded=group(read "contract-group.json")in
  List.iter(fun id->let env=Hashtbl.find decoded.environments(text "id" env)in let f=Hashtbl.find env.features(`Id id)in let a=Types.Feature.attributes f in
   observe(Printf.sprintf "publication/%s/%s/schedule/%s"env.id lookup id)(envelope(boolean(Schedule.is_schedule_active_millis ~schedule:a.schedule ~schedule_type:a.schedule_type(int_of_float(number(member "referenceClock" expected)))|>result)))(envelope(boolean(id="scheduled-active"))))((member "scheduled" expected|>to_list|>List.map to_string)@["scheduled-active"])
 )["id";"name";"alias"])(member "environments" expected|>to_list);
 (* Mutable native models must also be copied at direct ingestion. *)
 let c=await(sync_manifest ~client:(make "prod"(`String "member"))~fetch_hook:fetch)in
 let g=await(get_flags ~client:c ~fetch_hook:fetch(Types.Group.Id group_id))in
 let installed=await(set_flags ~client:c ~group:g)in Hashtbl.clear g.environments;
 if should ~client:installed(`Id group_id)(`Id "toggle")|>result<>true then failwith "Native caller mutation escaped snapshot";
 List.iter(fun wire->let r=outcome(fun()->ignore(await(get_manifest ~client:c ~fetch_hook:(fun _->Lwt.return_ok("{\"version\":\"v1\",\"groups\":[],\"extra\":\""^wire^"\"}"))));`Null)in if member "error" r<>`String "validation"then failwith "Malformed Unicode accepted")["\\ud800";"\\udfff";"\\ud800x"];
 (match Sys.getenv_opt "VEXILLA_OBSERVATIONS_FILE"with None->()|Some path->Yojson.Safe.to_file path(`Assoc["protocol",`Int 1;"sdk",`String "ocaml";"runs",`List[`Assoc["runtime",`String "native";"observations",`List(List.rev !observations)]]]));
 Printf.printf "Shared OCaml contract passed: %d observations\n"(List.length !observations)
