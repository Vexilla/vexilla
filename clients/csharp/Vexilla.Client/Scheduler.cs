using System;

namespace Vexilla.Client
{
    public class Scheduler
    {
        public static bool IsScheduleFeatureActive(Feature feature)
        {
            return IsScheduleActive(feature.Schedule, feature.ScheduleType);
        }

        public static bool IsScheduleActive(Schedule schedule,
            string scheduleType)
        {
            return IsScheduleActiveWithNow(schedule, scheduleType,
                DateTimeOffset.UtcNow);
        }

        public static bool IsScheduleActiveWithNow(Schedule schedule,
            string scheduleType, DateTimeOffset now)
        {
            switch (scheduleType)
            {
                case ScheduleType.Empty:
                    return true;
                case ScheduleType.Global:
                case ScheduleType.Environment:

                    var nowTimestamp = now.ToUnixTimeMilliseconds();

                    var startDateTimeOffset =
                        DateTimeOffset.FromUnixTimeMilliseconds(schedule.Start);

                    var startOfStartDate = new DateTimeOffset(
                        startDateTimeOffset.Year,
                        startDateTimeOffset.Month,
                        startDateTimeOffset.Day,
                        0,
                        0,
                        0,
                        startDateTimeOffset.Offset
                    );

                    var endDateTimeOffset =
                        DateTimeOffset.FromUnixTimeMilliseconds(schedule.End);

                    var endOfEndDate = new DateTimeOffset(
                        endDateTimeOffset.Year,
                        endDateTimeOffset.Month,
                        endDateTimeOffset.Day,
                        23,
                        59,
                        59,
                        endDateTimeOffset.Offset
                    );

                    if (now < startOfStartDate || now > endOfEndDate)
                    {
                        return false;
                    }

                    var startTime =
                        DateTimeOffset.FromUnixTimeMilliseconds(schedule
                            .StartTime);
                    var endTime =
                        DateTimeOffset.FromUnixTimeMilliseconds(
                            schedule.EndTime);


                    switch (schedule.TimeType)
                    {
                        case ScheduleTimeType.None:
                            return true;

                        case ScheduleTimeType.StartEnd:

                            var startOfEndDate = new DateTimeOffset(
                                endDateTimeOffset.Year,
                                endDateTimeOffset.Month,
                                endDateTimeOffset.Day,
                                0,
                                0,
                                0,
                                endDateTimeOffset.Offset
                            );

                            var startDateTimestampWithStartTime = startOfStartDate.ToUnixTimeMilliseconds() + schedule.StartTime;

                            var endDateTimestampWithEndTime = startOfEndDate.ToUnixTimeMilliseconds() + schedule.EndTime;

                            return startDateTimestampWithStartTime <= nowTimestamp && nowTimestamp <= endDateTimestampWithEndTime;

                        case ScheduleTimeType.Daily:

                            var zeroDay =
                                DateTimeOffset.FromUnixTimeMilliseconds(0);

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
                            var zeroedEndTimestamp = zeroedEndDateTimeOffset
                                .ToUnixTimeMilliseconds();

                            var startTimestamp = todayZeroTimestamp +
                                                 zeroedStartTimestamp;
                            var endTimestamp =
                                todayZeroTimestamp + zeroedEndTimestamp;
                            if (zeroedStartTimestamp > zeroedEndTimestamp)
                            {
                                return nowTimestamp >= startTimestamp ||
                                    nowTimestamp <= endTimestamp;
                            }
                            else
                            {
                                return nowTimestamp >= startTimestamp &&
                                   nowTimestamp <= endTimestamp;
                            }
                    }

                    break;

                default: return false;
            }


            return false;
        }
    }
}