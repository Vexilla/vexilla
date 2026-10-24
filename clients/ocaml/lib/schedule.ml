let day value=let q=value/86400000 in (if value mod 86400000<0 then q-1 else q)*86400000
let modulo value=(value mod 86400000+86400000)mod 86400000
let is_schedule_active_millis ~schedule:s ~schedule_type now =
 let open Types.Schedule in
 if schedule_type=Empty then Ok true else
 if now<day s.start || now>day s.end'+86400000-1 then Ok false else
 match s.time_type with
 | None->Ok true
 | Start_end->Ok(now>=day s.start+s.start_time && now<=day s.end'+s.end_time)
 | Daily->let clock=modulo now and start=modulo s.start_time and finish=modulo s.end_time in Ok(if start<=finish then clock>=start&&clock<=finish else clock>=start||clock<=finish)
let is_schedule_active_with_now ~schedule ~schedule_type now =
 match Date_time.to_ms_res now with Ok millis->is_schedule_active_millis ~schedule ~schedule_type millis|Error e->Error e
let is_schedule_active ~schedule ~schedule_type=is_schedule_active_with_now ~schedule ~schedule_type(Date_time.Clock.now())
let is_schedule_feature_active feature=let a=Types.Feature.attributes feature in is_schedule_active ~schedule:a.schedule ~schedule_type:a.schedule_type
