using System;

namespace Vexilla.Client
{
    public class Scheduler
    {
        private const long Day = 86400000;
        private static long Mod(long value) { return ((value % Day) + Day) % Day; }
        private static long DayStart(long value) { return value - Mod(value); }
        public static bool IsScheduleFeatureActive(Feature feature) { return IsScheduleActive(feature.Schedule, feature.ScheduleType); }
        public static bool IsScheduleActive(Schedule schedule, string scheduleType) { return IsScheduleActiveMillis(schedule, scheduleType, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()); }
        public static bool IsScheduleActiveWithNow(Schedule schedule, string scheduleType, DateTimeOffset now) { return IsScheduleActiveMillis(schedule, scheduleType, now.ToUnixTimeMilliseconds()); }
        public static bool IsScheduleActiveMillis(Schedule schedule, string type, long now)
        {
            if (type == "")
            {
                return true;
            }

            if (now < DayStart(schedule.Start) || now > DayStart(schedule.End) + Day - 1)
            {
                return false;
            }

            if (schedule.TimeType == "none")
            {
                return true;
            }

            if (schedule.TimeType == "start/end")
            {
                return now >= DayStart(schedule.Start) + schedule.StartTime && now <= DayStart(schedule.End) + schedule.EndTime;
            }

            var clock = Mod(now); var start = Mod(schedule.StartTime); var end = Mod(schedule.EndTime);
            return start <= end ? clock >= start && clock <= end : clock >= start || clock <= end;
        }
    }
}
