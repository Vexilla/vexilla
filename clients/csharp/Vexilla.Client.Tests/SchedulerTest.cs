using System;
using NUnit.Framework;

namespace Vexilla.Client.Tests
{
    [TestFixture]
    public class SchedulerTest
    {

        [Test]
        public void TestSchedulerActiveNone()
        {
            var schedule = new Schedule
            {
                Start = 0,
                End = 0,
                Timezone = "UTC",
                TimeType = ScheduleTimeType.None,
                StartTime = 0,
                EndTime = 0
            };

            Assert.True(
                Scheduler.IsScheduleActive(schedule, ScheduleType.Empty));
        }

        [Test]
        public void TestSchedulerActiveStartEnd()
        {
            var now = DateTimeOffset.Now;
            var beforeSchedule = new Schedule
            {
                Start = now.AddDays(1).ToUnixTimeMilliseconds(),
                End = now.AddDays(2).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.StartEnd,
                StartTime = 0,
                EndTime = 0
            };

            Assert.False(Scheduler.IsScheduleActive(beforeSchedule,
                ScheduleType.Global));

            var duringSchedule = new Schedule
            {
                Start = now.AddDays(-1).ToUnixTimeMilliseconds(),
                End = now.AddDays(1).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.StartEnd,
                StartTime = 0,
                EndTime = 0
            };

            Assert.True(Scheduler.IsScheduleActive(duringSchedule,
                ScheduleType.Global));

            var afterSchedule = new Schedule
            {
                Start = now.AddDays(-2).ToUnixTimeMilliseconds(),
                End = now.AddDays(-1).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.StartEnd,
                StartTime = 0,
                EndTime = 0
            };

            Assert.False(Scheduler.IsScheduleActive(afterSchedule,
                ScheduleType.Global));
        }

        [Test]
        public void TestSchedulingActiveDaily()
        {
            var now = DateTimeOffset.Now;
            for(int hour = 0; i < 24; i++) {

                var mocked_now = new DateTimeOffset(
                    now.Year,
                    now.Month,
                    now.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeZoneInfo.Utc
                );

                var beforeDaySchedule = new Schedule
                {
                    Start = now.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = now.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = mocked_now.AddHours(1).ToUnixTimeMilliseconds(),
                    EndTime = mocked_now.AddHours(3).ToUnixTimeMilliseconds()
                };
                Assert.False(Scheduler.IsScheduleActiveWithNow(beforeDaySchedule,
                    ScheduleType.Global, mocked_now));


                var duringSchedule = new Schedule
                {
                    Start = now.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = now.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = mocked_now.AddHours(-1).ToUnixTimeMilliseconds(),
                    EndTime = mocked_now.AddHours(1).ToUnixTimeMilliseconds()
                };

                Assert.True(Scheduler.IsScheduleActiveWithNow(duringSchedule,
                    ScheduleType.Global, mocked_now));

                var afterDaySchedule = new Schedule
                {
                    Start = now.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = now.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = mocked_now.AddHours(-3).ToUnixTimeMilliseconds(),
                    EndTime = mocked_now.AddHours(-1).ToUnixTimeMilliseconds()
                };
                Assert.False(Scheduler.IsScheduleActiveWithNow(afterDaySchedule,
                    ScheduleType.Global, mocked_now));
            }

        }
    }
}