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

  const startOfStartDate = dayjs.utc(schedule.start).startOf("day");
  const endOfEndDate = dayjs.utc(schedule.end).endOf("day");

  if (
    currentTime.isBefore(startOfStartDate) ||
    currentTime.isAfter(endOfEndDate)
  ) {
    return false;
  }

  if (schedule.timeType === "none") {
    return true;
  }

  const startTime = dayjs.utc(schedule.startTime);
  const endTime = dayjs.utc(schedule.endTime);

  if (schedule.timeType === "start/end") {
    const startOfEndDate = dayjs.utc(schedule.end).startOf("day");

    const startDateTimestampWithStartTime =
      startOfStartDate.unix() * 1000 + schedule.startTime;
    const endDateTimestampWithEndTime =
      startOfEndDate.unix() * 1000 + schedule.endTime;

    return (
      startDateTimestampWithStartTime <= now &&
      now <= endDateTimestampWithEndTime
    );
  } else if (schedule.timeType === "daily") {
    const zeroDay = dayjs.utc(0);
    let zeroDayPlusCurrentTime = zeroDay
      .set("hour", currentTime.hour())
      .set("minute", currentTime.minute())
      .set("second", currentTime.second())
      .set("millisecond", currentTime.millisecond());

    let zeroedStart = zeroDay
      .set("hour", startTime.hour())
      .set("minute", startTime.minute())
      .set("second", startTime.second())
      .set("millisecond", startTime.millisecond());

    let zeroedEnd = zeroDay
      .set("hour", endTime.hour())
      .set("minute", endTime.minute())
      .set("second", endTime.second())
      .set("millisecond", endTime.millisecond());

    if (zeroedEnd.isBefore(zeroedStart)) {
      return (
        zeroDayPlusCurrentTime.isAfter(zeroedStart) ||
        zeroDayPlusCurrentTime.isBefore(zeroedEnd)
      );
    } else {
      return (
        zeroDayPlusCurrentTime.isAfter(zeroedStart) &&
        zeroDayPlusCurrentTime.isBefore(zeroedEnd)
      );
    }
  }

  return false;
}
