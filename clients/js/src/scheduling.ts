import type {
  VexillaFeature,
  VexillaSchedule,
  VexillaScheduleType,
} from "@vexilla/types";

const DAY = 86400000;
const day = (timestamp: number) => Math.floor(timestamp / DAY) * DAY;
const time = (timestamp: number) => ((timestamp % DAY) + DAY) % DAY;

export function isScheduledFeatureActive(feature: VexillaFeature) {
  return isScheduleActive(feature.schedule, feature.scheduleType);
}
export function isScheduleActive(
  schedule: VexillaSchedule,
  scheduleType: VexillaScheduleType
) {
  return isScheduleActiveWithNow(schedule, scheduleType, Date.now());
}
export function isScheduleActiveWithNow(
  schedule: VexillaSchedule,
  scheduleType: VexillaScheduleType,
  now: number
) {
  if (!scheduleType) {
    return true;
  }
  if (now < day(schedule.start) || now > day(schedule.end) + DAY - 1) {
    return false;
  }
  if (schedule.timeType === "none") {
    return true;
  }
  if (schedule.timeType === "start/end") {
    return (
      day(schedule.start) + schedule.startTime <= now &&
      now <= day(schedule.end) + schedule.endTime
    );
  }
  const start = time(schedule.startTime);
  const end = time(schedule.endTime);
  const current = time(now);
  return start <= end
    ? start <= current && current <= end
    : start <= current || current <= end;
}
