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

func TestSchedulingActiveStartEndSingleDay(tester *testing.T) {
	now := time.Now().UTC()
	// now := time.Now()
	zeroDay := time.UnixMilli(0)

	for hour := 0; hour < 24; hour++ {

		mockedNow := time.Date(
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
			Start:     mockedNow.UnixMilli(),
			End:       mockedNow.UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+3) * time.Hour).UnixMilli(),
		}

		isBeforeScheduleActive := IsScheduleActiveWithNow(beforeSchedule, GlobalScheduleType, mockedNow)

		if isBeforeScheduleActive {
			tester.Errorf("Hour %v: isBeforeScheduleActive", hour)
			log.Println()
		}

		duringSchedule := Schedule{
			Start:     mockedNow.UnixMilli(),
			End:       mockedNow.UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
		}

		isDuringScheduleActive := IsScheduleActiveWithNow(duringSchedule, GlobalScheduleType, mockedNow)

		if !isDuringScheduleActive {
			tester.Errorf("Hour %v: isDuringScheduleActive", hour)
			log.Println()
		}

		afterSchedule := Schedule{
			Start:     mockedNow.UnixMilli(),
			End:       mockedNow.UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-3) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
		}

		isAfterScheduleActive := IsScheduleActiveWithNow(afterSchedule, GlobalScheduleType, mockedNow)

		if isAfterScheduleActive {
			tester.Errorf("Hour %v: isAfterScheduleActive", hour)
			log.Println()
		}
	}
}

func TestSchedulingActiveStartEndMultiDay(tester *testing.T) {
	now := time.Now().UTC()
	// now := time.Now()
	zeroDay := time.UnixMilli(0)

	for hour := 0; hour < 24; hour++ {

		mockedNow := time.Date(
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
			Start:     mockedNow.Add(Day).UnixMilli(),
			End:       mockedNow.Add(2 * Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+2) * time.Hour).UnixMilli(),
		}

		isBeforeScheduleActive := IsScheduleActiveWithNow(beforeSchedule, GlobalScheduleType, mockedNow)

		if isBeforeScheduleActive {
			tester.Errorf("Hour %v: isBeforeScheduleActive", hour)
			log.Println()
		}

		duringSchedule := Schedule{
			Start:     mockedNow.Add(-1 * Day).UnixMilli(),
			End:       mockedNow.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
		}

		isDuringScheduleActive := IsScheduleActiveWithNow(duringSchedule, GlobalScheduleType, mockedNow)

		if !isDuringScheduleActive {
			tester.Errorf("Hour %v: isDuringScheduleActive", hour)
			log.Println()
		}

		afterSchedule := Schedule{
			Start:     mockedNow.Add(-2 * Day).UnixMilli(),
			End:       mockedNow.Add(-1 * Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  StartEndScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-2) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
		}

		isAfterScheduleActive := IsScheduleActiveWithNow(afterSchedule, GlobalScheduleType, mockedNow)

		if isAfterScheduleActive {
			tester.Errorf("Hour %v: isAfterScheduleActive", hour)
			log.Println()
		}
	}
}

func TestSchedulingActiveDailySingleDay(tester *testing.T) {
	now := time.Now().UTC()
	// now := time.Now()
	zeroDay := time.UnixMilli(0)

	for hour := 0; hour < 24; hour++ {

		mockedNow := time.Date(
			now.Year(),
			now.Month(),
			now.Day(),
			hour,
			0,
			0,
			0,
			time.UTC,
		)

		beforeWholeSchedule := Schedule{
			Start:     mockedNow.Add(Day).UnixMilli(),
			End:       mockedNow.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+3) * time.Hour).UnixMilli(),
		}

		isBeforeWholeScheduleActive := IsScheduleActiveWithNow(beforeWholeSchedule, GlobalScheduleType, mockedNow)

		if isBeforeWholeScheduleActive {
			tester.Errorf("Hour %v: isBeforeWholeScheduleActive", hour)
		}

		beforeDaySchedule := Schedule{
			Start:     mockedNow.UnixMilli(),
			End:       mockedNow.UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+3) * time.Hour).UnixMilli(),
		}

		isBeforeDayScheduleActive := IsScheduleActiveWithNow(beforeDaySchedule, GlobalScheduleType, mockedNow)

		if isBeforeDayScheduleActive {
			tester.Errorf("Hour %v: isBeforeDayScheduleActive", hour)
		}

		duringSchedule := Schedule{
			Start:     mockedNow.UnixMilli(),
			End:       mockedNow.UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
		}

		isDuringScheduleActive := IsScheduleActiveWithNow(duringSchedule, GlobalScheduleType, mockedNow)

		if !isDuringScheduleActive {
			tester.Errorf("Hour %v: isDuringScheduleActive", hour)
		}

		afterDaySchedule := Schedule{
			Start:     mockedNow.UnixMilli(),
			End:       mockedNow.UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-3) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
		}

		isAfterDayScheduleActive := IsScheduleActiveWithNow(afterDaySchedule, GlobalScheduleType, mockedNow)

		if isAfterDayScheduleActive {
			tester.Errorf("Hour %v: isAfterDayScheduleActive", hour)
		}

		afterWholeSchedule := Schedule{
			Start:     mockedNow.Add(-1 * Day).UnixMilli(),
			End:       mockedNow.Add(-1 * Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-3) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
		}

		isAfterWholeScheduleActive := IsScheduleActiveWithNow(afterWholeSchedule, GlobalScheduleType, mockedNow)

		if isAfterWholeScheduleActive {
			tester.Errorf("Hour %v: isAfterWholeScheduleActive", hour)
		}
	}

}

func TestSchedulingActiveDailyMultiDay(tester *testing.T) {
	now := time.Now().UTC()
	// now := time.Now()
	zeroDay := time.UnixMilli(0)

	for hour := 0; hour < 24; hour++ {

		mockedNow := time.Date(
			now.Year(),
			now.Month(),
			now.Day(),
			hour,
			0,
			0,
			0,
			time.UTC,
		)

		beforeWholeSchedule := Schedule{
			Start:     mockedNow.Add(Day).UnixMilli(),
			End:       mockedNow.Add(3 * Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+3) * time.Hour).UnixMilli(),
		}

		isBeforeWholeScheduleActive := IsScheduleActiveWithNow(beforeWholeSchedule, GlobalScheduleType, mockedNow)

		if isBeforeWholeScheduleActive {
			tester.Errorf("Hour %v: isBeforeWholeScheduleActive", hour)
		}

		beforeDaySchedule := Schedule{
			Start:     mockedNow.Add(-1 * Day).UnixMilli(),
			End:       mockedNow.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+3) * time.Hour).UnixMilli(),
		}

		isBeforeDayScheduleActive := IsScheduleActiveWithNow(beforeDaySchedule, GlobalScheduleType, mockedNow)

		if isBeforeDayScheduleActive {
			tester.Errorf("Hour %v: isBeforeDayScheduleActive", hour)
		}

		duringSchedule := Schedule{
			Start:     mockedNow.Add(-1 * Day).UnixMilli(),
			End:       mockedNow.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour+1) * time.Hour).UnixMilli(),
		}

		isDuringScheduleActive := IsScheduleActiveWithNow(duringSchedule, GlobalScheduleType, mockedNow)

		if !isDuringScheduleActive {
			tester.Errorf("Hour %v: isDuringScheduleActive", hour)
		}

		afterDaySchedule := Schedule{
			Start:     mockedNow.Add(-1 * Day).UnixMilli(),
			End:       mockedNow.Add(Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-3) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
		}

		isAfterDayScheduleActive := IsScheduleActiveWithNow(afterDaySchedule, GlobalScheduleType, mockedNow)

		if isAfterDayScheduleActive {
			tester.Errorf("Hour %v: isAfterDayScheduleActive", hour)
		}

		afterWholeSchedule := Schedule{
			Start:     mockedNow.Add(-3 * Day).UnixMilli(),
			End:       mockedNow.Add(-1 * Day).UnixMilli(),
			Timezone:  "UTC",
			TimeType:  DailyScheduleTimeType,
			StartTime: zeroDay.Add(time.Duration(hour-3) * time.Hour).UnixMilli(),
			EndTime:   zeroDay.Add(time.Duration(hour-1) * time.Hour).UnixMilli(),
		}

		isAfterWholeScheduleActive := IsScheduleActiveWithNow(afterWholeSchedule, GlobalScheduleType, mockedNow)

		if isAfterWholeScheduleActive {
			tester.Errorf("Hour %v: isAfterWholeScheduleActive", hour)
		}
	}

}
