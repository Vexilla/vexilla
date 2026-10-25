let fnv32_offset_basis=2166136261L
let fnv32_prime=16777619L
let fnv32a text =
  Unicode.check text;
  String.fold_left(fun acc byte->Int64.logand(Int64.mul(Int64.logxor acc(Int64.of_int(Char.code byte)))fnv32_prime)0xffffffffL)fnv32_offset_basis text |> Int64.to_int
let hash_instance_id ~seed instance_id = mod_float(float_of_int(fnv32a instance_id)*.seed)1000. /.1000.
let instance_text = function
 | `String text when Unicode.valid text->Ok text
 | (`Int n) when Int64.of_float(float_of_int n)<>Int64.of_int n->Error `Invalid_instance_id
 | (`Int _|`Float _) as value->
   let number=match value with `Int n->float_of_int n|`Float n->n in
   if not(Float.is_finite number)then Error `Invalid_instance_id else if number=0. then Ok "0" else (
   let n=Float.abs number in
   let rec shortest p =
     let candidate=Printf.sprintf "%.*e" (p-1)n in
     if float_of_string candidate=n then candidate else (
       let mantissa,exponent=match String.split_on_char 'e' candidate with [m;e]->m,int_of_string e|_->assert false in
       let digits=String.concat ""(String.split_on_char '.' mantissa)in
       let coefficient=Int64.of_string digits in
       let neighbor delta=Int64.to_string(Int64.add coefficient delta)^"e"^string_of_int(exponent-p+1)in
       let a=neighbor(-1L)and b=neighbor 1L in
       if float_of_string a=n then a else if float_of_string b=n then b else if p<17 then shortest(p+1)else failwith "No binary64 representation")in
   let raw=shortest 1 in
   let mantissa,exponent=match String.split_on_char 'e' raw with [m;e]->m,int_of_string e|_->assert false in
   let point=(match String.index_opt mantissa '.' with Some i->i|None->String.length mantissa)+exponent in
   let digits=String.concat ""(String.split_on_char '.' mantissa)in
   let rec trim n=if n>1 && digits.[n-1]='0' then trim(n-1)else n in
   let digits=String.sub digits 0(trim(String.length digits))in let length=String.length digits in
   let rendered=if point>0 && point<=21 then if length<=point then digits^String.make(point-length)'0' else String.sub digits 0 point^"."^String.sub digits point(length-point)
    else if point<=0 && point> -6 then "0."^String.make(-point)'0'^digits
    else String.sub digits 0 1^(if length>1 then "."^String.sub digits 1(length-1)else "")^"e"^(if point-1>=0 then "+"else "-")^string_of_int(abs(point-1))in
   Ok((if number<0. then "-"else "")^rendered))
 | _->Error `Invalid_instance_id
