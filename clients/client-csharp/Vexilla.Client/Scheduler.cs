using System;

namespace Vexilla.Client
{
    public class Scheduler
    {
        public static bool IsScheduleFeatureActive(Feature feature)
        {
            return IsScheduleActive(feature.Schedule, feature.ScheduleType);
        }

        public static bool IsScheduleActive(Schedule schedule, string scheduleType)
        {
            return IsScheduleActiveWithNow(schedule, scheduleType, DateTimeOffset.Now);
        }

        public static bool IsScheduleActiveWithNow(Schedule schedule, string scheduleType, DateTimeOffset now)
        {
            switch (scheduleType)
            {
                case ScheduleType.Empty:
                    return true;
                case ScheduleType.Global:
                case ScheduleType.Environment:

                    var isInDateRange = false;

                    var startDateTimeOffset = DateTimeOffset.FromUnixTimeMilliseconds(schedule.Start);

                    var startOfStartDate = new DateTimeOffset(
                        startDateTimeOffset.Year,
                        startDateTimeOffset.Month,
                        startDateTimeOffset.Day,
                        0,
                        0,
                        0,
                        startDateTimeOffset.Offset
                    );

                    var endDateTimeOffset = DateTimeOffset.FromUnixTimeMilliseconds(schedule.End);

                    var endOfEndDate = new DateTimeOffset(
                        endDateTimeOffset.Year,
                        endDateTimeOffset.Month,
                        endDateTimeOffset.Day,
                        23,
                        59,
                        59,
                        endDateTimeOffset.Offset
                    );

                    if (now < startOfStartDate || now > endOfEndDate) return false;

                    var startTime = DateTimeOffset.FromUnixTimeMilliseconds(schedule.StartTime);
                    var endTime = DateTimeOffset.FromUnixTimeMilliseconds(schedule.EndTime);


                    switch (schedule.TimeType)
                    {
                        case ScheduleTimeType.None:
                            return true;

                        case ScheduleTimeType.StartEnd:
                            var startDateTime = new DateTimeOffset(
                                startDateTimeOffset.Year,
                                startDateTimeOffset.Month,
                                startDateTimeOffset.Day,
                                startTime.Hour,
                                startTime.Minute,
                                startTime.Second,
                                startTime.Millisecond,
                                startDateTimeOffset.Offset
                            );

                            var endDateTime = new DateTimeOffset(
                                endDateTimeOffset.Year,
                                endDateTimeOffset.Month,
                                endDateTimeOffset.Day,
                                endTime.Hour,
                                endTime.Minute,
                                endTime.Second,
                                endTime.Millisecond,
                                endDateTimeOffset.Offset
                            );

                            return now > startDateTime && now < endDateTime;

                        case ScheduleTimeType.Daily:

                            var zeroDay = DateTimeOffset.FromUnixTimeMilliseconds(0);
                            var nowTimestamp = now.ToUnixTimeMilliseconds();

                            var todayZeroTimestamp = new DateTimeOffset(
                                now.Year,
                                now.Month,
                                now.Day,
                                0,
                                0,
                                0,
                                0,
                                now.Offset
                            ).ToUnixTimeMilliseconds();

                            var zeroedStartTimestamp = new DateTimeOffset(
                                zeroDay.Year,
                                zeroDay.Month,
                                zeroDay.Day,
                                startTime.Hour,
                                startTime.Minute,
                                startTime.Second,
                                startTime.Millisecond,
                                now.Offset
                            ).ToUnixTimeMilliseconds();

                            var zeroedEndDateTimeOffset = new DateTimeOffset(
                                zeroDay.Year,
                                zeroDay.Month,
                                zeroDay.Day,
                                endTime.Hour,
                                endTime.Minute,
                                endTime.Second,
                                endTime.Millisecond,
                                now.Offset
                            );
                            var zeroedEndTimestamp = zeroedEndDateTimeOffset.ToUnixTimeMilliseconds();
                            var zeroedEndTimestampPlusDay = zeroedEndDateTimeOffset.AddDays(1).ToUnixTimeMilliseconds();

                            var startTimestamp = todayZeroTimestamp + zeroedStartTimestamp;
                            var endTimestamp = todayZeroTimestamp + zeroedEndTimestamp;
                            if (zeroedStartTimestamp > zeroedEndTimestamp)
                                endTimestamp = todayZeroTimestamp + zeroedEndTimestampPlusDay;

                            return nowTimestamp > startTimestamp && nowTimestamp < endTimestamp;
                    }

                    break;

                default: return false;
            }


            return false;
        }
    }
}