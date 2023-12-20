import { VexillaSchedule } from "@vexilla/types";
import { isScheduleActive, isScheduleActiveWithNow } from "./scheduling";
import dayjs from "dayjs";
import { labelledAssert } from "./utils/testing";

const now = dayjs.utc();
const nowWithZeroTime = now
  .set("hour", 0)
  .set("minute", 0)
  .set("second", 0)
  .set("millisecond", 0);

const zeroDay = dayjs.utc(0);
const zeroDayWithCurrentTime = zeroDay
  .set("hour", now.hour())
  .set("minute", now.minute())
  .set("second", now.second())
  .set("millisecond", now.millisecond());

/*

  Empty Schedule

*/

const scheduleForEmpty: VexillaSchedule = {
  start: 0,
  end: 0,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
};

const shouldEmpty = isScheduleActive(scheduleForEmpty, "");

labelledAssert(shouldEmpty, "Should be within schedule for empty schedule");

/*

  Empty Time Schedule

*/

const scheduleBefore: VexillaSchedule = {
  start: now.add(1, "day").unix() * 1000,
  end: now.add(3, "day").unix() * 1000,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
};

const scheduleDuring: VexillaSchedule = {
  start: now.subtract(1, "day").unix() * 1000,
  end: now.add(1, "day").unix() * 1000,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
};

const scheduleAfter: VexillaSchedule = {
  start: now.subtract(3, "day").unix() * 1000,
  end: now.subtract(1, "day").unix() * 1000,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
};

const shouldBefore = isScheduleActive(scheduleBefore, "global");
const shouldDuring = isScheduleActive(scheduleDuring, "global");
const shouldAfter = isScheduleActive(scheduleAfter, "global");

labelledAssert(
  !shouldBefore,
  "Should be before schedule for schedule without time"
);
labelledAssert(
  shouldDuring,
  "Should be within schedule for schedule without time"
);
labelledAssert(
  !shouldAfter,
  "Should be after schedule for schedule without time"
);

/*

  StartEnd

*/

// const scheduleForStartEndBefore: VexillaSchedule = {
//   start: nowWithZeroTime.unix() * 1000,
//   end: nowWithZeroTime.add(1, "day").unix() * 1000,
//   timezone: "UTC",
//   timeType: "start/end",
//   // startTime: now.add(1, "hour").unix() * 1000,
//   // endTime: now.add(3, "hour").unix() * 1000,
//   startTime: zeroDayWithCurrentTime.add(1, "hour").unix() * 1000,
//   endTime: zeroDayWithCurrentTime.add(3, "hour").unix() * 1000,
// };

// const scheduleForStartEndDuring: VexillaSchedule = {
//   start: nowWithZeroTime.unix() * 1000,
//   end: nowWithZeroTime.add(1, "day").unix() * 1000,
//   timezone: "UTC",
//   timeType: "start/end",
//   startTime: zeroDayWithCurrentTime.subtract(1, "hour").unix() * 1000,
//   endTime: zeroDayWithCurrentTime.add(1, "hour").unix() * 1000,
// };

// const scheduleForStartEndAfter: VexillaSchedule = {
//   start: nowWithZeroTime.subtract(1, "day").unix() * 1000,
//   end: nowWithZeroTime.unix() * 1000,
//   timezone: "UTC",
//   timeType: "start/end",
//   startTime: zeroDayWithCurrentTime.subtract(3, "hour").unix() * 1000,
//   endTime: zeroDayWithCurrentTime.subtract(1, "hour").unix() * 1000,
// };

// const shouldStartEndBefore = isScheduleActive(
//   scheduleForStartEndBefore,
//   "global"
// );
// const shouldStartEndDuring = isScheduleActive(
//   scheduleForStartEndDuring,
//   "global"
// );
// const shouldStartEndAfter = isScheduleActive(
//   scheduleForStartEndAfter,
//   "global"
// );

// labelledAssert(
//   !shouldStartEndBefore,
//   "Should be before schedule for schedule with start/end time"
// );
// labelledAssert(
//   shouldStartEndDuring,
//   "Should be within schedule for schedule with start/end time"
// );
// labelledAssert(
//   !shouldStartEndAfter,
//   "Should be after schedule for schedule with start/end time"
// );

/*

  Daily

*/

// testDailyScheduleWithNow(0, "Zero");
for (let hour = 0; hour < 24; hour++) {
  testDailyScheduleWithNow(
    dayjs().set("hour", hour).set("minute", 0).set("second", 0).unix() * 1000,
    `Today Hour ${hour}`
  );
}

function testDailyScheduleWithNow(mockedNow: number, label: string) {
  const mockedNowDateTime = dayjs.utc(mockedNow);

  const zeroDayWithMockedTime = zeroDay
    .set("hour", mockedNowDateTime.hour())
    .set("minute", mockedNowDateTime.minute())
    .set("second", mockedNowDateTime.second())
    .set("millisecond", mockedNowDateTime.millisecond());

  const scheduleForDailyBefore: VexillaSchedule = {
    start: mockedNowDateTime.subtract(2, "day").unix() * 1000,
    end: mockedNowDateTime.add(2, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(3, "hour").unix() * 1000,
  };

  const scheduleForDailyDuring: VexillaSchedule = {
    start: mockedNowDateTime.subtract(2, "day").unix() * 1000,
    end: mockedNowDateTime.add(2, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
  };

  const scheduleForDailyAfter: VexillaSchedule = {
    start: mockedNowDateTime.subtract(2, "day").unix() * 1000,
    end: mockedNowDateTime.add(2, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(3, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
  };

  const shouldDailyBefore = isScheduleActiveWithNow(
    scheduleForDailyBefore,
    "global",
    mockedNow
  );
  labelledAssert(
    !shouldDailyBefore,
    `${label}: Should be before schedule for schedule with daily time`
  );

  const shouldDailyDuring = isScheduleActiveWithNow(
    scheduleForDailyDuring,
    "global",
    mockedNow
  );
  labelledAssert(
    shouldDailyDuring,
    `${label}: Should be within schedule for schedule with daily time`
  );

  const shouldDailyAfter = isScheduleActiveWithNow(
    scheduleForDailyAfter,
    "global",
    mockedNow
  );
  labelledAssert(
    !shouldDailyAfter,
    `${label}: Should be after schedule for schedule with daily time`
  );
}
