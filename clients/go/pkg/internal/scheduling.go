package internal

import "time"

const dayMillis int64 = 86400000

func modDay(value int64) int64   { return (value%dayMillis + dayMillis) % dayMillis }
func dayStart(value int64) int64 { return value - modDay(value) }
func IsScheduledFeatureActive(feature Feature) bool {
	return IsScheduleActive(feature.Schedule, feature.ScheduleType)
}
func IsScheduleActive(schedule Schedule, scheduleType ScheduleType) bool {
	return IsScheduleActiveWithNow(schedule, scheduleType, time.Now())
}
func IsScheduleActiveWithNow(schedule Schedule, scheduleType ScheduleType, now time.Time) bool {
	if scheduleType == EmptyScheduleType {
		return true
	}
	current := now.UnixMilli()
	start, end := dayStart(schedule.Start), dayStart(schedule.End)
	if current < start || current > end+dayMillis-1 {
		return false
	}
	if schedule.TimeType == NoneScheduleTimeType {
		return true
	}
	if schedule.TimeType == StartEndScheduleTimeType {
		return current >= start+schedule.StartTime && current <= end+schedule.EndTime
	}
	s, e, t := modDay(schedule.StartTime), modDay(schedule.EndTime), modDay(current)
	if s <= e {
		return t >= s && t <= e
	}
	return t >= s || t <= e
}
