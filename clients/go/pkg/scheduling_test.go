package internal

import (
	"testing"
	"time"
)

const Day = 24 * time.Hour

func TestSchedulingActiveNone(tester *testing.T) {
	schedule := Schedule{
		Start:     0,
		End:       0,
		Timezone:  "UTC",
		TimeType:  NoneScheduleTimeType,
		StartTime: 0,
		EndTime:   0,
	}

	if !IsScheduleActive(schedule, EmptyScheduleType) {
		tester.Fatal()
	}
}

func TestSchedulingActiveStartEnd(tester *testing.T) {
	now := time.Now()

	beforeSchedule := Schedule{
		Start:     now.Add(Day).UnixMilli(),
		End:       now.Add(2 * Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  StartEndScheduleTimeType,
		StartTime: 0,
		EndTime:   0,
	}

	isBeforeScheduleActive := IsScheduleActive(beforeSchedule, GlobalScheduleType)

	if isBeforeScheduleActive {
		tester.Fail()
	}

	duringSchedule := Schedule{
		Start:     now.Add(-1 * Day).UnixMilli(),
		End:       now.Add(Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  StartEndScheduleTimeType,
		StartTime: 0,
		EndTime:   0,
	}

	isDuringScheduleActive := IsScheduleActive(duringSchedule, GlobalScheduleType)

	if !isDuringScheduleActive {
		tester.Fail()
	}

	afterSchedule := Schedule{
		Start:     now.Add(-2 * Day).UnixMilli(),
		End:       now.Add(-1 * Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  StartEndScheduleTimeType,
		StartTime: 0,
		EndTime:   0,
	}

	isAfterScheduleActive := IsScheduleActive(afterSchedule, GlobalScheduleType)

	if isAfterScheduleActive {
		tester.Fail()
	}
}

func TestSchedulingActiveDaily(tester *testing.T) {

	now := time.Now().UTC()

	beforeWholeSchedule := Schedule{
		Start:     now.Add(Day).UnixMilli(),
		End:       now.Add(2 * Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  DailyScheduleTimeType,
		StartTime: 0,
		EndTime:   0,
	}

	isBeforeWholeScheduleActive := IsScheduleActive(beforeWholeSchedule, GlobalScheduleType)

	if isBeforeWholeScheduleActive {
		tester.Error("isBeforeWholeScheduleActive")
	}

	beforeDaySchedule := Schedule{
		Start:     now.Add(-1 * Day).UnixMilli(),
		End:       now.Add(Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  DailyScheduleTimeType,
		StartTime: now.Add(time.Hour).UnixMilli(),
		EndTime:   now.Add(2 * time.Hour).UnixMilli(),
	}

	isBeforeDayScheduleActive := IsScheduleActive(beforeDaySchedule, GlobalScheduleType)

	if isBeforeDayScheduleActive {
		tester.Error("isBeforeDayScheduleActive")
	}

	duringSchedule := Schedule{
		Start:     now.Add(-1 * Day).UnixMilli(),
		End:       now.Add(Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  DailyScheduleTimeType,
		StartTime: now.Add(-1 * time.Hour).UnixMilli(),
		EndTime:   now.Add(time.Hour).UnixMilli(),
	}

	isDuringScheduleActive := IsScheduleActive(duringSchedule, GlobalScheduleType)

	if !isDuringScheduleActive {
		tester.Error("isDuringScheduleActive")
	}

	afterDaySchedule := Schedule{
		Start:     now.Add(-1 * Day).UnixMilli(),
		End:       now.Add(Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  DailyScheduleTimeType,
		StartTime: now.Add(-2 * time.Hour).UnixMilli(),
		EndTime:   now.Add(-1 * time.Hour).UnixMilli(),
	}

	isAfterDayScheduleActive := IsScheduleActive(afterDaySchedule, GlobalScheduleType)

	if isAfterDayScheduleActive {
		tester.Error("isAfterDayScheduleActive")
	}

	afterWholeSchedule := Schedule{
		Start:     now.Add(-2 * Day).UnixMilli(),
		End:       now.Add(-1 * Day).UnixMilli(),
		Timezone:  "UTC",
		TimeType:  StartEndScheduleTimeType,
		StartTime: 0,
		EndTime:   0,
	}

	isAfterWholeScheduleActive := IsScheduleActive(afterWholeSchedule, GlobalScheduleType)

	if isAfterWholeScheduleActive {
		tester.Error("isAfterWholeScheduleActive")
	}

}
