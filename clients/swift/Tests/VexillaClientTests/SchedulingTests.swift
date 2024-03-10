@testable import VexillaClient
import XCTest

func createTestSchedule(startDate: Date, endDate: Date, timeType: ScheduleTimeType, zeroDayWithMockedTime: Date, startHourModifier: Int, endHourModifier: Int) -> Schedule {
  var calendar = Calendar(identifier: Calendar.Identifier.iso8601)
  calendar.timeZone = TimeZone(identifier: "UTC")!
  return Schedule(
    start: Int(startDate.timeIntervalSince1970) * 1000,
    end: Int(endDate.timeIntervalSince1970) * 1000,
    timezone: "UTC",
    timeType: timeType,
    startTime: Int(calendar.date(byAdding: .hour, value: startHourModifier, to: zeroDayWithMockedTime)!.timeIntervalSince1970) * 1000,
    endTime: Int(calendar.date(byAdding: .hour, value: endHourModifier, to: zeroDayWithMockedTime)!.timeIntervalSince1970) * 1000
  )
}

final class VexillaSchedulingTests: XCTestCase {
  func testEmpty() {
    let schedule = Schedule(start: 0, end: 0, timezone: "UTC", timeType: ScheduleTimeType.none, startTime: 0, endTime: 0)

    XCTAssertTrue(try isScheduleActive(schedule: schedule, scheduleType: ScheduleType.empty))
  }

  func testStartEndSingleDay() throws {
    var calendar = Calendar(identifier: Calendar.Identifier.iso8601)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let now = Date()
    let zeroDay = Date(timeIntervalSince1970: TimeInterval(0))

    for hour in 0 ... 23 {
      let mockedNow = calendar.date(bySetting: .hour, value: hour, of: now)!

      let zeroDayWithMockedTime = calendar.date(bySetting: .hour, value: hour, of: zeroDay)!

      let beforeSchedule = createTestSchedule(startDate: mockedNow, endDate: mockedNow, timeType: .startEnd, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: 1, endHourModifier: 3)

      let isBeforeScheduleActive = try isScheduleActiveWithNow(schedule: beforeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isBeforeScheduleActive, "Hour \(hour): Before test failed")

      let duringSchedule = createTestSchedule(startDate: mockedNow, endDate: mockedNow, timeType: .startEnd, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -1, endHourModifier: 1)

      let isDuringScheduleActive = try isScheduleActiveWithNow(schedule: duringSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertTrue(isDuringScheduleActive, "Hour \(hour): During test failed")

      let afterSchedule = createTestSchedule(startDate: mockedNow, endDate: mockedNow, timeType: .startEnd, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -3, endHourModifier: -1)

      let isAfterScheduleActive = try isScheduleActiveWithNow(schedule: afterSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isAfterScheduleActive, "Hour \(hour): After test failed")
    }
  }

  func testStartEndMultiDay() throws {
    var calendar = Calendar(identifier: Calendar.Identifier.iso8601)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let now = Date()
    let zeroDay = Date(timeIntervalSince1970: TimeInterval(0))

    for hour in 0 ... 23 {
      let mockedNow = calendar.date(bySetting: .hour, value: hour, of: now)!

      let zeroDayWithMockedTime = calendar.date(bySetting: .hour, value: hour, of: zeroDay)!

      let beforeSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: 1, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: 3, to: mockedNow)!, timeType: .startEnd, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: 1, endHourModifier: 3)

      let isBeforeScheduleActive = try isScheduleActiveWithNow(schedule: beforeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isBeforeScheduleActive, "Hour \(hour): Before test failed")

      let duringSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: -1, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: 1, to: mockedNow)!, timeType: .startEnd, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -1, endHourModifier: 1)

      let isDuringScheduleActive = try isScheduleActiveWithNow(schedule: duringSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertTrue(isDuringScheduleActive, "Hour \(hour): During test failed")

      let afterSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: -3, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: -1, to: mockedNow)!, timeType: .startEnd, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -3, endHourModifier: -1)

      let isAfterScheduleActive = try isScheduleActiveWithNow(schedule: afterSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isAfterScheduleActive, "Hour \(hour): After test failed")
    }
  }

  func testDailySingleDay() throws {
    var calendar = Calendar(identifier: Calendar.Identifier.iso8601)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let now = Date()
    let zeroDay = Date(timeIntervalSince1970: TimeInterval(0))

    for hour in 0 ... 23 {
      let mockedNow = calendar.date(bySetting: .hour, value: hour, of: now)!

      let zeroDayWithMockedTime = calendar.date(bySetting: .hour, value: hour, of: zeroDay)!

      let beforeWholeMockedNow = calendar.date(byAdding: .day, value: 1, to: mockedNow)!

      let beforeWholeSchedule = createTestSchedule(startDate: beforeWholeMockedNow, endDate: beforeWholeMockedNow, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: 1, endHourModifier: 3)

      let isBeforeWholeScheduleActive = try isScheduleActiveWithNow(schedule: beforeWholeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isBeforeWholeScheduleActive, "Hour \(hour): Before whole test failed")

      let beforeSchedule = createTestSchedule(startDate: mockedNow, endDate: mockedNow, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: 1, endHourModifier: 3)

      let isBeforeScheduleActive = try isScheduleActiveWithNow(schedule: beforeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isBeforeScheduleActive, "Hour \(hour): Before test failed")

      let duringSchedule = createTestSchedule(startDate: mockedNow, endDate: mockedNow, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -1, endHourModifier: 1)

      let isDuringScheduleActive = try isScheduleActiveWithNow(schedule: duringSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertTrue(isDuringScheduleActive, "Hour \(hour): During test failed")

      let afterSchedule = createTestSchedule(startDate: mockedNow, endDate: mockedNow, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -3, endHourModifier: -1)

      let isAfterScheduleActive = try isScheduleActiveWithNow(schedule: afterSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isAfterScheduleActive, "Hour \(hour): After test failed")

      let afterWholeMockedNow = calendar.date(byAdding: .day, value: -1, to: mockedNow)!

      let afterWholeSchedule = createTestSchedule(startDate: afterWholeMockedNow, endDate: afterWholeMockedNow, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -3, endHourModifier: -1)

      let isAfterWholeScheduleActive = try isScheduleActiveWithNow(schedule: afterWholeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isAfterWholeScheduleActive, "Hour \(hour): After whole test failed")
    }
  }

  func testDailyMultiDay() throws {
    var calendar = Calendar(identifier: Calendar.Identifier.iso8601)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let now = Date()
    let zeroDay = Date(timeIntervalSince1970: TimeInterval(0))

    for hour in 0 ... 23 {
      let mockedNow = calendar.date(bySetting: .hour, value: hour, of: now)!

      let zeroDayWithMockedTime = calendar.date(bySetting: .hour, value: hour, of: zeroDay)!

      let beforeWholeSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: 1, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: 3, to: mockedNow)!, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: 1, endHourModifier: 3)

      let isBeforeWholeScheduleActive = try isScheduleActiveWithNow(schedule: beforeWholeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isBeforeWholeScheduleActive, "Hour \(hour): Before whole test failed")

      let beforeSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: -1, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: 1, to: mockedNow)!, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: 1, endHourModifier: 3)

      let isBeforeScheduleActive = try isScheduleActiveWithNow(schedule: beforeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isBeforeScheduleActive, "Hour \(hour): Before test failed")

      let duringSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: -1, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: 1, to: mockedNow)!, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -1, endHourModifier: 1)

      let isDuringScheduleActive = try isScheduleActiveWithNow(schedule: duringSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertTrue(isDuringScheduleActive, "Hour \(hour): During test failed")

      let afterSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: -1, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: 1, to: mockedNow)!, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -3, endHourModifier: -1)

      let isAfterScheduleActive = try isScheduleActiveWithNow(schedule: afterSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isAfterScheduleActive, "Hour \(hour): After test failed")

      let afterWholeSchedule = createTestSchedule(startDate: calendar.date(byAdding: .day, value: -3, to: mockedNow)!, endDate: calendar.date(byAdding: .day, value: -1, to: mockedNow)!, timeType: .daily, zeroDayWithMockedTime: zeroDayWithMockedTime, startHourModifier: -3, endHourModifier: -1)

      let isAfterWholeScheduleActive = try isScheduleActiveWithNow(schedule: afterWholeSchedule, scheduleType: ScheduleType.global, now: mockedNow)

      XCTAssertFalse(isAfterWholeScheduleActive, "Hour \(hour): After whole test failed")
    }
  }
}
