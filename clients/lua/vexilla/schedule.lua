local M = {}
local DAY = 86400000
local function midnight(t) return math.floor(t / DAY) * DAY end
function M.active(schedule, schedule_type, now)
  if schedule_type == '' then return true end
  if now < midnight(schedule.start) or now > midnight(schedule['end']) + DAY - 1 then return false end
  if schedule.timeType == 'none' then return true end
  if schedule.timeType == 'start/end' then
    return now >= midnight(schedule.start) + schedule.startTime and now <= midnight(schedule['end']) + schedule.endTime
  end
  local start_time, end_time, time = schedule.startTime % DAY, schedule.endTime % DAY, now % DAY
  if start_time <= end_time then return time >= start_time and time <= end_time end
  return time >= start_time or time <= end_time
end
function M.now()
  return math.floor(require('socket').gettime() * 1000)
end
return M
