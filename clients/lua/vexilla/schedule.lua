local Scheduler = {}
local DAY = 86400000
local function midnight(timestamp)
  return math.floor(timestamp / DAY) * DAY
end
function Scheduler.active(schedule, schedule_type, now)
  if schedule_type == "" then
    return true
  end
  if now < midnight(schedule.start) or now > midnight(schedule["end"]) + DAY - 1 then
    return false
  end
  if schedule.timeType == "none" then
    return true
  end
  if schedule.timeType == "start/end" then
    return now >= midnight(schedule.start) + schedule.startTime
      and now <= midnight(schedule["end"]) + schedule.endTime
  end
  local start_time, end_time, current_time =
    schedule.startTime % DAY, schedule.endTime % DAY, now % DAY
  if start_time <= end_time then
    return current_time >= start_time and current_time <= end_time
  end
  return current_time >= start_time or current_time <= end_time
end
function Scheduler.now()
  return math.floor(require("socket").gettime() * 1000)
end
return Scheduler
