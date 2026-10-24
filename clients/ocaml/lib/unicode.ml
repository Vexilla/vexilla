(* Strict Unicode scalar UTF-8. No normalization or replacement is performed. *)
let codepoints text =
  let length=String.length text in
  let rec loop i acc =
    if i=length then Some(List.rev acc) else
    let first=Char.code text.[i] in
    let width,min_code,initial = if first<0x80 then 1,0,first else if first>=0xc2 && first<=0xdf then 2,0x80,first land 0x1f else if first>=0xe0 && first<=0xef then 3,0x800,first land 0xf else if first>=0xf0 && first<=0xf4 then 4,0x10000,first land 7 else 0,0,0 in
    if width=0 || i+width>length then None else
    let rec continuation j code = if j=width then Some code else let byte=Char.code text.[i+j] in if byte land 0xc0<>0x80 then None else continuation (j+1) ((code lsl 6) lor (byte land 0x3f)) in
    match continuation 1 initial with
    | Some code when code>=min_code && code<=0x10ffff && not(code>=0xd800 && code<=0xdfff) ->loop(i+width)((code,String.sub text i width)::acc)
    | _ ->None
  in loop 0 []
let valid text=Option.is_some(codepoints text)
let check text=if not(valid text) then invalid_arg "Malformed Unicode string"
let check_json_wire text =
  check text;
  let length=String.length text in
  let hex i = if i+4>length then invalid_arg "Invalid Unicode escape";try int_of_string("0x"^String.sub text i 4) with _->invalid_arg "Invalid Unicode escape" in
  let rec loop i quoted =
    if i>=length then () else
    match text.[i],quoted with
    | '"',_ ->loop (i+1) (not quoted)
    | '\\',true ->
      if i+1>=length then invalid_arg "Invalid JSON escape";
      if text.[i+1]<>'u' then loop(i+2)quoted else
      let code=hex(i+2) in
      if code>=0xd800 && code<=0xdbff then (
        if i+12>length || String.sub text (i+6) 2<>"\\u" then invalid_arg "Unpaired Unicode surrogate";
        let low=hex(i+8) in if low<0xdc00 || low>0xdfff then invalid_arg "Unpaired Unicode surrogate";
        loop(i+12)quoted)
      else if code>=0xdc00 && code<=0xdfff then invalid_arg "Unpaired Unicode surrogate" else loop(i+6)quoted
    | _ ->loop(i+1)quoted
  in loop 0 false
let parse text=check_json_wire text;Yojson.Safe.from_string text
