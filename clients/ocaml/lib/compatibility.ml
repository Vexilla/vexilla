open Yojson.Safe.Util
let data=Yojson.Safe.from_string Compatibility_data.json
let unicode=member "unicode" data
let lower=unicode |> member "lower" |> to_assoc |> List.map(fun(k,v)->k,to_string v)
let ranges key=unicode |> member key |> to_list |> List.map(function `List[`Int a;`Int b]->a,b|_->assert false)
let cased=ranges "casedRanges"
let ignorable=ranges "ignorableRanges"
let in_ranges n ranges=List.exists(fun(a,b)->n>=a && n<=b)ranges
let lower_name text =
  let chars=Array.of_list(Option.get(Unicode.codepoints text)) in
  let cased_at i=i>=0 && i<Array.length chars && in_ranges(fst chars.(i))cased in
  let rec skip i direction=if i>=0 && i<Array.length chars && in_ranges(fst chars.(i))ignorable then skip(i+direction)direction else i in
  chars |> Array.mapi(fun i(code,ch)->if code=0x3a3 then if cased_at(skip(i-1)(-1)) && not(cased_at(skip(i+1)1)) then "ς" else "σ" else Option.value(List.assoc_opt ch lower)~default:ch) |> Array.to_list |> String.concat ""
let upper n=n>=65&&n<=90||n>=192&&n<=214||n>=216&&n<=222
let lower_base n=n>=97&&n<=122||n>=223&&n<=246||n>=248&&n<=255
let symbol n=n>=32&&n<=38||n>=40&&n<=47||n>=58&&n<=64||n>=91&&n<=96||n>=123&&n<=126||n>=160&&n<=191||n=215||n=247
let normalize text =
  Unicode.check text;
  let chars=Option.get(Unicode.codepoints text) in
  let has_lower=List.exists(fun(n,_)->lower_base n)chars in
  let has_room=List.exists(fun(n,_)->symbol n)chars in
  let text=if chars<>[] && not has_lower then lower_name text else text in
  let chars=Array.of_list(Option.get(Unicode.codepoints text)) in
  let out=Buffer.create(String.length text) in
  if has_room then Buffer.add_string out text else (
    let rec loop i=if i<Array.length chars then (
      let j=ref(i+1) in while !j<Array.length chars && upper(fst chars.(!j)) do incr j done;
      Buffer.add_string out(snd chars.(i));
      if not(upper(fst chars.(i))) && !j>i+1 then (
        Buffer.add_char out ' ';if !j>i+2 then (for k=i+1 to !j-2 do Buffer.add_string out(snd chars.(k)) done;Buffer.add_char out ' ');
        Buffer.add_string out(snd chars.(!j-1));loop !j) else loop(i+1)) in loop 0);
  let chars=Array.of_list(Option.get(Unicode.codepoints(lower_name(Buffer.contents out)))) in
  Buffer.clear out;
  let rec loop i=if i<Array.length chars then (
    if symbol(fst chars.(i)) then (
      let j=ref i in while !j<Array.length chars && symbol(fst chars.(!j)) do incr j done;
      if !j<Array.length chars then (Buffer.add_char out '-';if fst chars.(!j)<>39 then Buffer.add_string out(snd chars.(!j));loop(!j+1)))
    else (if fst chars.(i)<>39 then Buffer.add_string out(snd chars.(i));loop(i+1))) in
  loop 0;Buffer.contents out
let zones=data |> member "timezone" |> member "identifiers" |> to_list |> List.map(fun v->String.lowercase_ascii(to_string v))
let timezone text =
  if List.mem(String.lowercase_ascii text)zones then true else
  let length=String.length text in
  let digit i=i<length && text.[i]>='0'&&text.[i]<='9' in
  let number i=(Char.code text.[i]-48)*10+Char.code text.[i+1]-48 in
  (length=3||length=5||length=6) && (text.[0]='+'||text.[0]='-') && digit 1&&digit 2&&number 1<=23 &&
  (length=3 || if length=5 then digit 3&&digit 4&&number 3<=59 else text.[3]=':'&&digit 4&&digit 5&&number 4<=59)
