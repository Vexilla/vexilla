package internal

import (
	"log"
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

	for hour := 0; hour < 24; hour++ {

		// now := time.Now().UTC()
		now := time.Now()

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

		beforeSchedule := Schedule{
			Start:     mocked_now.Add(Day).UnixMilli(),
			End:       mocked_now.Add(2 * Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: mocked_now.Add(time.Hour).UnixMilli(),
			EndTime:   mocked_now.Add(2 * time.Hour).UnixMilli(),
		}

		isBeforeScheduleActive := IsScheduleActive(beforeSchedule, GlobalScheduleType)

		if isBeforeScheduleActive {
			tester.Errorf("Hour %v: isBeforeScheduleActive", hour)
		}

		duringSchedule := Schedule{
			Start:     mocked_now.Add(-1 * Day).UnixMilli(),
			End:       mocked_now.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: mocked_now.Add(-1 * time.Hour).UnixMilli(),
			EndTime:   mocked_now.Add(time.Hour).UnixMilli(),
		}

		isDuringScheduleActive := IsScheduleActive(duringSchedule, GlobalScheduleType)

		if !isDuringScheduleActive {
			tester.Errorf("Hour %v: isDuringScheduleActive", hour)
			log.Println()
		}

		afterSchedule := Schedule{
			Start:     mocked_now.Add(-2 * Day).UnixMilli(),
			End:       mocked_now.Add(-1 * Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: mocked_now.Add(-2 * time.Hour).UnixMilli(),
			EndTime:   mocked_now.Add(-1 * time.Hour).UnixMilli(),
		}

		isAfterScheduleActive := IsScheduleActive(afterSchedule, GlobalScheduleType)

		if isAfterScheduleActive {
			tester.Errorf("Hour %v: isAfterScheduleActive", hour)
			log.Println()
		}
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
