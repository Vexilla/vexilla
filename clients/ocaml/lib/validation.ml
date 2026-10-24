exception Invalid of string
let check ok message=if not ok then raise(Invalid message)
let obj=function `Assoc fields->fields|_->raise(Invalid "Expected object")
let array=function `List values->values|_->raise(Invalid "Expected array")
let get key v=Option.value(List.assoc_opt key(obj v))~default:`Null
let text ?(nonempty=false)=function `String s when not nonempty||s<>""->s|_->raise(Invalid "Expected string")
let number ?(integer=false) value =
  let n=match value with `Int n->float_of_int n|`Float n->n|`Intlit s->(try float_of_string s with _->nan)|_->nan in
  check(Float.is_finite n && (not integer||Float.floor n=n && Float.abs n<=9007199254740991.))"Expected finite number in integer bounds";n
let rec tree=function
 | `String s->check(Unicode.valid s)"Malformed Unicode string"
 | `Assoc fields->List.iter(fun(k,v)->check(Unicode.valid k)"Malformed Unicode key";tree v)fields
 | `List values->List.iter tree values
 | _->()
let member value allowed=check(List.mem(text value)allowed)"Unsupported enum"
let safe_id value=let id=text ~nonempty:true value in check(not(List.mem id["manifest";"config";".";".."]) && not(String.exists(fun c->c='/'||c='\\'||c='\000')id))"Unsafe group ID";id
let alias table id name=List.iter(fun key->check(not(Hashtbl.mem table key)||Hashtbl.find table key=id)"Alias collision";Hashtbl.replace table key id)[id;name;Compatibility.normalize name]
let schedule v =
 tree v;ignore(obj v);List.iter(fun k->ignore(number ~integer:true(get k v)))["start";"end";"startTime";"endTime"];
 member(get "timeType" v)["none";"start/end";"daily"];check(Compatibility.timezone(text ~nonempty:true(get "timezone" v)))"Invalid timezone"
let feature v =
 tree v;ignore(obj v);ignore(text(get "name" v));ignore(text ~nonempty:true(get "featureId" v));member(get "scheduleType" v)["";"global";"environment"];schedule(get "schedule" v);
 match text(get "featureType" v) with
 | "toggle"->check(match get "value" v with `Bool _->true|_->false)"Toggle must be boolean"
 | "gradual"->ignore(number(get "value" v));let seed=number(get "seed" v)in check(seed>0. && seed<=1.)"seed must satisfy 0 < seed <= 1"
 | "selective"|"value" as kind->
   member(get "valueType" v)["string";"number"];let numeric=get "valueType" v=`String "number" in
   if numeric then member(get "numberType" v)["int";"float"];
   let item x=if numeric then ignore(number ~integer:(get "numberType" v=`String "int") x)else ignore(text x)in
   if kind="selective" then List.iter item(array(get "value" v))else item(get "value" v)
 | _->raise(Invalid "Unsupported featureType")
let features v=let fields=obj v in let aliases=Hashtbl.create 10 in List.iter(fun(id,f)->feature f;check(text ~nonempty:true(get "featureId" f)=id)"Feature map ID mismatch";alias aliases id(text(get "name" f)))fields;fields
let manifest v =
 tree v;check(get "version" v=`String "v1")"Manifest version must be v1";let ids=Hashtbl.create 10 and aliases=Hashtbl.create 10 in
 List.iter(fun g->let id=safe_id(get "groupId" g)in check(not(Hashtbl.mem ids id))"Duplicate group ID";Hashtbl.add ids id();alias aliases id(text(get "name" g)))(array(get "groups" v))
let same a b key=match List.assoc_opt key(obj a),List.assoc_opt key(obj b) with
 | None,None->true|Some(`Assoc _|`List _),_|_,Some(`Assoc _|`List _)->false
 | Some(`Int _|`Float _ as a),Some(`Int _|`Float _ as b)->number a=number b
 | a,b->a=b
let group v =
 tree v;ignore(safe_id(get "groupId" v));ignore(text(get "name" v));check(get "version"(get "meta" v)=`String "v1")"Group version must be v1";
 let defaults=features(get "features" v)in let aliases=Hashtbl.create 10 in
 List.iter(fun(id,e)->check(text ~nonempty:true(get "environmentId" e)=id)"Environment map ID mismatch";alias aliases id(text(get "name" e));let values=features(get "features" e)in
 check(List.sort compare(List.map fst values)=List.sort compare(List.map fst defaults))"Incomplete environment features";
 List.iter(fun(fid,f)->let original=List.assoc fid defaults in List.iter(fun k->check(same f original k)"Environment feature identity/subtype mismatch")["name";"featureType";"valueType";"numberType"])values)(obj(get "environments" v))
let result check_value decode value=try check_value value;decode value with Invalid message|Invalid_argument message|Failure message->Error message|Not_found->Error "Missing required field"
