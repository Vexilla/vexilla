import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import {
  VexillaFeature,
  VexillaSchedule,
  VexillaScheduleType,
} from "@vexilla/types";
export function isScheduledFeatureActive(feature: VexillaFeature) {
  return isScheduleActive(feature.schedule, feature.scheduleType);
}

export function isScheduleActive(
  schedule: VexillaSchedule,
  scheduleType: VexillaScheduleType
) {
  const now = Date.now();
  return isScheduleActiveWithNow(schedule, scheduleType, now);
}

export function isScheduleActiveWithNow(
  schedule: VexillaSchedule,
  scheduleType: VexillaScheduleType,
  now: number
) {
  if (!scheduleType) {
    return true;
  }

  const currentTime = dayjs.utc(now);

  const startDate = dayjs
    .utc(schedule.start)
    .set("hour", 0)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);
  const endDate = dayjs
    .utc(schedule.end)
    .set("hour", 23)
    .set("minute", 59)
    .set("second", 59)
    .set("millisecond", 999);

  if (currentTime.isBefore(startDate) || currentTime.isAfter(endDate)) {
    return false;
  }

  if (schedule.timeType === "none") {
    return true;
  }

  const startTime = dayjs.utc(schedule.startTime);
  const endTime = dayjs.utc(schedule.endTime);

  if (schedule.timeType === "start/end") {
    const startDayWithStartTime = startDate
      .set("hour", startTime.hour())
      .set("minute", startTime.minute())
      .set("second", startTime.second())
      .set("millisecond", startTime.millisecond());

    const endDayWithEndTime = endDate
      .set("hour", endTime.hour())
      .set("minute", endTime.minute())
      .set("second", endTime.second())
      .set("millisecond", endTime.millisecond());

    return (
      currentTime.isAfter(startDayWithStartTime) &&
      currentTime.isBefore(endDayWithEndTime)
    );
  } else if (schedule.timeType === "daily") {
    const currentDayWithStartTime = currentTime
      .set("hour", startTime.hour())
      .set("minute", startTime.minute())
      .set("second", startTime.second())
      .set("millisecond", startTime.millisecond());

    const currentDayWithEndTime = currentTime
      .set("hour", endTime.hour())
      .set("minute", endTime.minute())
      .set("second", endTime.second())
      .set("millisecond", endTime.millisecond());

    return (
      currentTime.isAfter(currentDayWithStartTime) &&
      currentTime.isBefore(currentDayWithEndTime)
    );
  }

  return false;
}
