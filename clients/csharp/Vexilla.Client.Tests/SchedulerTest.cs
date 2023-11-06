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
            var beforeWholeSchedule = new Schedule
            {
                Start = now.AddDays(1).ToUnixTimeMilliseconds(),
                End = now.AddDays(2).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.Daily,
                StartTime = 0,
                EndTime = 0
            };

            Assert.False(Scheduler.IsScheduleActive(beforeWholeSchedule,
                ScheduleType.Global));

            var beforeDaySchedule = new Schedule
            {
                Start = now.AddDays(-1).ToUnixTimeMilliseconds(),
                End = now.AddDays(1).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.Daily,
                StartTime = now.AddHours(1).ToUnixTimeMilliseconds(),
                EndTime = now.AddHours(2).ToUnixTimeMilliseconds()
            };
            Assert.False(Scheduler.IsScheduleActive(beforeDaySchedule,
                ScheduleType.Global));


            var duringSchedule = new Schedule
            {
                Start = now.AddDays(-1).ToUnixTimeMilliseconds(),
                End = now.AddDays(1).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.Daily,
                StartTime = now.AddHours(-1).ToUnixTimeMilliseconds(),
                EndTime = now.AddHours(1).ToUnixTimeMilliseconds()
            };

            Assert.True(Scheduler.IsScheduleActive(duringSchedule,
                ScheduleType.Global));

            var afterDaySchedule = new Schedule
            {
                Start = now.AddDays(-1).ToUnixTimeMilliseconds(),
                End = now.AddDays(1).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.Daily,
                StartTime = now.AddHours(-2).ToUnixTimeMilliseconds(),
                EndTime = now.AddHours(-1).ToUnixTimeMilliseconds()
            };
            Assert.False(Scheduler.IsScheduleActive(afterDaySchedule,
                ScheduleType.Global));

            var afterWholeSchedule = new Schedule
            {
                Start = now.AddDays(-2).ToUnixTimeMilliseconds(),
                End = now.AddDays(-1).ToUnixTimeMilliseconds(),
                Timezone = "UTC",
                TimeType = ScheduleTimeType.Daily,
                StartTime = 0,
                EndTime = 0
            };

            Assert.False(Scheduler.IsScheduleActive(afterWholeSchedule,
                ScheduleType.Global));
        }
    }
}