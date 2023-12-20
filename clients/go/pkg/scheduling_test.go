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

	for hour := 0; hour < 24; hour++ {

		now := time.Now().UTC()

		mocked_now := time.Date(
			now.Year(),
			now.Month(),
			now.Day(),
			hour,
			0,
			0,
			0,
			time.UTC,
		)

		beforeDaySchedule := Schedule{
			Start:     mocked_now.Add(-1 * Day).UnixMilli(),
			End:       mocked_now.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: mocked_now.Add(time.Hour).UnixMilli(),
			EndTime:   mocked_now.Add(2 * time.Hour).UnixMilli(),
		}

		isBeforeDayScheduleActive := IsScheduleActiveWithNow(beforeDaySchedule, GlobalScheduleType, mocked_now)

		if isBeforeDayScheduleActive {
			tester.Errorf("Hour %v: isBeforeDayScheduleActive", hour)
		}

		duringSchedule := Schedule{
			Start:     mocked_now.Add(-1 * Day).UnixMilli(),
			End:       mocked_now.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: mocked_now.Add(-1 * time.Hour).UnixMilli(),
			EndTime:   mocked_now.Add(time.Hour).UnixMilli(),
		}

		isDuringScheduleActive := IsScheduleActiveWithNow(duringSchedule, GlobalScheduleType, mocked_now)

		if !isDuringScheduleActive {
			tester.Errorf("Hour %v: isDuringScheduleActive", hour)
		}

		afterDaySchedule := Schedule{
			Start:     mocked_now.Add(-1 * Day).UnixMilli(),
			End:       mocked_now.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: mocked_now.Add(-2 * time.Hour).UnixMilli(),
			EndTime:   mocked_now.Add(-1 * time.Hour).UnixMilli(),
		}

		isAfterDayScheduleActive := IsScheduleActiveWithNow(afterDaySchedule, GlobalScheduleType, mocked_now)

		if isAfterDayScheduleActive {
			tester.Errorf("Hour %v: isAfterDayScheduleActive", hour)
		}
	}

}
