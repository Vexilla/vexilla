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

  const startDate = dayjs.utc(schedule.start).startOf("day");
  const endDate = dayjs.utc(schedule.end).endOf("day");

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

    console.log("start/end");

    return (
      currentTime.isAfter(startDayWithStartTime) &&
      currentTime.isBefore(endDayWithEndTime)
    );
  } else if (schedule.timeType === "daily") {
    console.log("daily");

    const zeroDay = dayjs.utc(0);
    const zeroDayPlusCurrentTime = zeroDay
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
      // if (zeroDayPlusCurrentTime.day() === zeroedEnd.day()) {
      //   console.log("subtracting day, previous value:", zeroedStart.unix());
      //   zeroedStart = zeroedStart.subtract(1, "day");
      // } else {
      //   console.log("adding day, previous value:", zeroedEnd.unix());
      zeroedEnd = zeroedEnd.add(1, "day");
      // }
    }

    console.log({
      start: zeroedStart.toString(),
      now: zeroDayPlusCurrentTime.toString(),
      end: zeroedEnd.toString(),
      isAfterStart: zeroDayPlusCurrentTime.isAfter(zeroedStart),
      isBeforeEnd: zeroDayPlusCurrentTime.isBefore(zeroedEnd),
      startTimestamp: zeroedStart.unix(),
      nowTimestamp: zeroDayPlusCurrentTime.unix(),
      endTimestamp: zeroedEnd.unix(),
    });

    return (
      zeroDayPlusCurrentTime.isAfter(zeroedStart) &&
      zeroDayPlusCurrentTime.isBefore(zeroedEnd)
    );
  }

  return false;
}
