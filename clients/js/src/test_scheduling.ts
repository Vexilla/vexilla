import { VexillaSchedule } from "@vexilla/types";
import { isScheduleActive, isScheduleActiveWithNow } from "./scheduling";
import dayjs from "dayjs";
import { labelledAssert } from "./utils/testing";

const now = dayjs.utc();
// const nowWithZeroTime = now
//   .set("hour", 0)
//   .set("minute", 0)
//   .set("second", 0)
//   .set("millisecond", 0);

const zeroDay = dayjs.utc(0);
// const zeroDayWithMockedTime = zeroDay
//   .set("hour", now.hour())
//   .set("minute", now.minute())
//   .set("second", now.second())
//   .set("millisecond", now.millisecond());

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

const shouldBefore = isScheduleActiveWithNow(
  scheduleBefore,
  "global",
  now.unix() * 1000
);
const shouldDuring = isScheduleActiveWithNow(
  scheduleDuring,
  "global",
  now.unix() * 1000
);
const shouldAfter = isScheduleActiveWithNow(
  scheduleAfter,
  "global",
  now.unix() * 1000
);

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

  StartEnd - Single Day

*/

for (let hour = 0; hour < 24; hour++) {
  const mockedNow = now.set("hour", hour);
  const zeroDayWithMockedTime = zeroDay.set("hour", hour);

  const scheduleForStartEndBefore: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "start/end",
    startTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(3, "hour").unix() * 1000,
  };

  const shouldStartEndBefore = isScheduleActiveWithNow(
    scheduleForStartEndBefore,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldStartEndBefore,
    `Hour: ${hour}: Should be before schedule for schedule with start/end single day`
  );

  const scheduleForStartEndDuring: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "start/end",
    startTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
  };

  const shouldStartEndDuring = isScheduleActiveWithNow(
    scheduleForStartEndDuring,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    shouldStartEndDuring,
    `Hour: ${hour}: Should be within schedule for schedule with start/end single day`
  );

  const scheduleForStartEndAfter: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "start/end",
    startTime: zeroDayWithMockedTime.subtract(3, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
  };

  const shouldStartEndAfter = isScheduleActiveWithNow(
    scheduleForStartEndAfter,
    "global",
    mockedNow.unix() * 1000
  );

  labelledAssert(
    !shouldStartEndAfter,
    `Hour: ${hour}: Should be after schedule for schedule with start/end single day`
  );
}

/*

  StartEnd - Multi Day

*/

for (let hour = 0; hour < 24; hour++) {
  const mockedNow = now.set("hour", hour);
  const zeroDayWithMockedTime = zeroDay.set("hour", hour);

  const scheduleForStartEndBefore: VexillaSchedule = {
    start: mockedNow.add(1, "day").unix() * 1000,
    end: mockedNow.add(3, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "start/end",
    startTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(3, "hour").unix() * 1000,
  };

  const shouldStartEndBefore = isScheduleActiveWithNow(
    scheduleForStartEndBefore,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldStartEndBefore,
    `Hour: ${hour}: Should be before schedule for schedule with start/end multi day`
  );

  const scheduleForStartEndDuring: VexillaSchedule = {
    start: mockedNow.subtract(1, "day").unix() * 1000,
    end: mockedNow.add(1, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "start/end",
    startTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
  };

  const shouldStartEndDuring = isScheduleActiveWithNow(
    scheduleForStartEndDuring,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    shouldStartEndDuring,
    `Hour: ${hour}: Should be within schedule for schedule with start/end multi day`
  );

  const scheduleForStartEndAfter: VexillaSchedule = {
    start: mockedNow.subtract(3, "day").unix() * 1000,
    end: mockedNow.subtract(1, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "start/end",
    startTime: zeroDayWithMockedTime.subtract(3, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
  };

  const shouldStartEndAfter = isScheduleActiveWithNow(
    scheduleForStartEndAfter,
    "global",
    mockedNow.unix() * 1000
  );

  labelledAssert(
    !shouldStartEndAfter,
    `Hour: ${hour}: Should be after schedule for schedule with start/end multi day`
  );
}

/*

  Daily - Single Day

*/

for (let hour = 0; hour < 24; hour++) {
  const mockedNow = now.set("hour", hour);
  const zeroDayWithMockedTime = zeroDay.set("hour", hour);

  const scheduleForDailyBeforeWhole: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(3, "hour").unix() * 1000,
  };

  const shouldDailyBeforeWhole = isScheduleActiveWithNow(
    scheduleForDailyBeforeWhole,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyBeforeWhole,
    `Hour: ${hour}: Should be before schedule for whole schedule with daily time`
  );

  const scheduleForDailyBeforeDay: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(3, "hour").unix() * 1000,
  };

  const shouldDailyBeforeDay = isScheduleActiveWithNow(
    scheduleForDailyBeforeDay,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyBeforeDay,
    `Hour: ${hour}: Should be before schedule for day schedule with daily time`
  );

  const scheduleForDailyDuring: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
  };

  const shouldDailyDuring = isScheduleActiveWithNow(
    scheduleForDailyDuring,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    shouldDailyDuring,
    `Hour ${hour}: Should be within schedule for schedule with daily time`
  );

  const scheduleForDailyAfterDay: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(3, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
  };

  const shouldDailyAfterDay = isScheduleActiveWithNow(
    scheduleForDailyAfterDay,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyAfterDay,
    `Hour ${hour}: Should be after schedule for day schedule with daily time`
  );

  const scheduleForDailyAfterWhole: VexillaSchedule = {
    start: mockedNow.unix() * 1000,
    end: mockedNow.unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(3, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
  };

  const shouldDailyAfterWhole = isScheduleActiveWithNow(
    scheduleForDailyAfterWhole,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyAfterWhole,
    `Hour ${hour}: Should be after schedule for day schedule with daily time`
  );
}

/*

  Daily - Multi Day

*/

for (let hour = 0; hour < 24; hour++) {
  const mockedNow = now.set("hour", hour);
  const zeroDayWithMockedTime = zeroDay.set("hour", hour);

  const scheduleForDailyBeforeWhole: VexillaSchedule = {
    start: mockedNow.add(1, "day").unix() * 1000,
    end: mockedNow.add(3, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(3, "hour").unix() * 1000,
  };

  const shouldDailyBeforeWhole = isScheduleActiveWithNow(
    scheduleForDailyBeforeWhole,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyBeforeWhole,
    `Hour: ${hour}: Should be before schedule for whole schedule with daily time`
  );

  const scheduleForDailyBeforeDay: VexillaSchedule = {
    start: mockedNow.subtract(1, "day").unix() * 1000,
    end: mockedNow.add(1, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(3, "hour").unix() * 1000,
  };

  const shouldDailyBeforeDay = isScheduleActiveWithNow(
    scheduleForDailyBeforeDay,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyBeforeDay,
    `Hour: ${hour}: Should be before schedule for day schedule with daily time`
  );

  const scheduleForDailyDuring: VexillaSchedule = {
    start: mockedNow.subtract(1, "day").unix() * 1000,
    end: mockedNow.add(1, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.add(1, "hour").unix() * 1000,
  };

  const shouldDailyDuring = isScheduleActiveWithNow(
    scheduleForDailyDuring,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    shouldDailyDuring,
    `Hour ${hour}: Should be within schedule for schedule with daily time`
  );

  const scheduleForDailyAfterDay: VexillaSchedule = {
    start: mockedNow.subtract(2, "day").unix() * 1000,
    end: mockedNow.add(2, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(3, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
  };

  const shouldDailyAfterDay = isScheduleActiveWithNow(
    scheduleForDailyAfterDay,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyAfterDay,
    `Hour ${hour}: Should be after schedule for day schedule with daily time`
  );

  const scheduleForDailyAfterWhole: VexillaSchedule = {
    start: mockedNow.subtract(3, "day").unix() * 1000,
    end: mockedNow.subtract(1, "day").unix() * 1000,
    timezone: "UTC",
    timeType: "daily",
    startTime: zeroDayWithMockedTime.subtract(3, "hour").unix() * 1000,
    endTime: zeroDayWithMockedTime.subtract(1, "hour").unix() * 1000,
  };

  const shouldDailyAfterWhole = isScheduleActiveWithNow(
    scheduleForDailyAfterWhole,
    "global",
    mockedNow.unix() * 1000
  );
  labelledAssert(
    !shouldDailyAfterWhole,
    `Hour ${hour}: Should be after schedule for day schedule with daily time`
  );
}
