using System;
using NUnit.Framework;
using System.Text.Json;

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
        public void TestSchedulerActiveStartEndSingleDay()
        {
            var now = DateTimeOffset.UtcNow;
            var zeroDay = DateTimeOffset.FromUnixTimeMilliseconds(0);

            for(int hour = 0; hour < 24; hour++) {

                var mockedNow = new DateTimeOffset(
                    now.Year,
                    now.Month,
                    now.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var zeroDayWithMockedTime = new DateTimeOffset(
                    zeroDay.Year,
                    zeroDay.Month,
                    zeroDay.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var beforeSchedule = new Schedule
                {
                    Start = mockedNow.ToUnixTimeMilliseconds(),
                    End = mockedNow.ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.StartEnd,
                    StartTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(3).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(beforeSchedule,
                    ScheduleType.Global, mockedNow));

                var duringSchedule = new Schedule
                {
                    Start = mockedNow.ToUnixTimeMilliseconds(),
                    End = mockedNow.ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.StartEnd,
                    StartTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds()
                };

                Assert.True(Scheduler.IsScheduleActiveWithNow(duringSchedule,
                    ScheduleType.Global, mockedNow));

                var afterSchedule = new Schedule
                {
                    Start = mockedNow.ToUnixTimeMilliseconds(),
                    End = mockedNow.ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.StartEnd,
                    StartTime = zeroDayWithMockedTime.AddHours(-3).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(afterSchedule,
                    ScheduleType.Global, mockedNow));
            }
        }

        [Test]
        public void TestSchedulerActiveStartEndMultiDay()
        {
            var now = DateTimeOffset.Now;
            var zeroDay = DateTimeOffset.FromUnixTimeMilliseconds(0);

            for(int hour = 0; hour < 24; hour++) {

                var mockedNow = new DateTimeOffset(
                    now.Year,
                    now.Month,
                    now.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var zeroDayWithMockedTime = new DateTimeOffset(
                    zeroDay.Year,
                    zeroDay.Month,
                    zeroDay.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var beforeSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(2).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.StartEnd,
                    StartTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(3).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(beforeSchedule,
                    ScheduleType.Global, mockedNow));

                var duringSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.StartEnd,
                    StartTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds()
                };

                Assert.True(Scheduler.IsScheduleActiveWithNow(duringSchedule,
                    ScheduleType.Global, mockedNow));

                var afterSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(-2).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.StartEnd,
                    StartTime = zeroDayWithMockedTime.AddHours(-3).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(afterSchedule,
                    ScheduleType.Global, mockedNow));
            }
        }

        [Test]
        public void TestSchedulingActiveDailySingleDay()
        {
            var now = DateTimeOffset.Now;
            var zeroDay = DateTimeOffset.FromUnixTimeMilliseconds(0);

            for(int hour = 0; hour < 24; hour++) {
                var mockedNow = new DateTimeOffset(
                    now.Year,
                    now.Month,
                    now.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var zeroDayWithMockedTime = new DateTimeOffset(
                    zeroDay.Year,
                    zeroDay.Month,
                    zeroDay.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var beforeWholeSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(3).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(beforeWholeSchedule,
                    ScheduleType.Global, mockedNow));

                var beforeDaySchedule = new Schedule
                {
                    Start = mockedNow.ToUnixTimeMilliseconds(),
                    End = mockedNow.ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(3).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(beforeDaySchedule,
                    ScheduleType.Global, mockedNow));

                var duringSchedule = new Schedule
                {
                    Start = mockedNow.ToUnixTimeMilliseconds(),
                    End = mockedNow.ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds()
                };

                Assert.True(Scheduler.IsScheduleActiveWithNow(duringSchedule,
                    ScheduleType.Global, mockedNow));

                var afterDaySchedule = new Schedule
                {
                    Start = mockedNow.ToUnixTimeMilliseconds(),
                    End = mockedNow.ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(-3).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds()
                };
                Assert.False(Scheduler.IsScheduleActiveWithNow(afterDaySchedule,
                    ScheduleType.Global, mockedNow));

                var afterWholeSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(-3).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds()
                };
                Assert.False(Scheduler.IsScheduleActiveWithNow(afterWholeSchedule,
                    ScheduleType.Global, mockedNow));
            }
        }


        [Test]
        public void TestSchedulingActiveDailyMultiDay()
        {
            var now = DateTimeOffset.Now;
            var zeroDay = DateTimeOffset.FromUnixTimeMilliseconds(0);

            for(int hour = 0; hour < 24; hour++) {
                var mockedNow = new DateTimeOffset(
                    now.Year,
                    now.Month,
                    now.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var zeroDayWithMockedTime = new DateTimeOffset(
                    zeroDay.Year,
                    zeroDay.Month,
                    zeroDay.Day,
                    hour,
                    0,
                    0,
                    0,
                    TimeSpan.Zero
                );

                var beforeWholeSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(3).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(3).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(beforeWholeSchedule,
                    ScheduleType.Global, mockedNow));

                var beforeDaySchedule = new Schedule
                {
                    Start = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(3).ToUnixTimeMilliseconds()
                };

                Assert.False(Scheduler.IsScheduleActiveWithNow(beforeDaySchedule,
                    ScheduleType.Global, mockedNow));


                var duringSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(1).ToUnixTimeMilliseconds()
                };

                Assert.True(Scheduler.IsScheduleActiveWithNow(duringSchedule,
                    ScheduleType.Global, mockedNow));

                var afterDaySchedule = new Schedule
                {
                    Start = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(-3).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds()
                };
                Assert.False(Scheduler.IsScheduleActiveWithNow(afterDaySchedule,
                    ScheduleType.Global, mockedNow));

                var afterWholeSchedule = new Schedule
                {
                    Start = mockedNow.AddDays(-3).ToUnixTimeMilliseconds(),
                    End = mockedNow.AddDays(-1).ToUnixTimeMilliseconds(),
                    Timezone = "UTC",
                    TimeType = ScheduleTimeType.Daily,
                    StartTime = zeroDayWithMockedTime.AddHours(-3).ToUnixTimeMilliseconds(),
                    EndTime = zeroDayWithMockedTime.AddHours(-1).ToUnixTimeMilliseconds()
                };
                Assert.False(Scheduler.IsScheduleActiveWithNow(afterWholeSchedule,
                    ScheduleType.Global, mockedNow));
            }
        }
    }
}