import Foundation

func isScheduledFeatureActive(feature: Feature) throws -> Bool {
  return try isScheduleActive(schedule: feature.schedule, scheduleType: feature.scheduleType)
}

func isScheduleActive(schedule: Schedule, scheduleType: ScheduleType) throws -> Bool {
  return try isScheduleActiveWithNow(schedule: schedule, scheduleType: scheduleType, now: Date())
}

func isScheduleActiveWithNow(schedule: Schedule, scheduleType: ScheduleType, now: Date) throws -> Bool {
  let nowSeconds = now.timeIntervalSince1970
  var calendar = Calendar(identifier: Calendar.Identifier.iso8601)
  guard let utc = TimeZone(identifier: "UTC") else {
    throw VexillaSchedulingError.couldNotCreateUTCTimezone
  }
  calendar.timeZone = utc

  switch scheduleType {
  case .empty:
    return true

  case .environment, .global:
    let startDate = Date(timeIntervalSince1970: TimeInterval(schedule.start / 1000))
    let startOfStartDate = calendar.startOfDay(for: startDate)

    let endDate = Date(timeIntervalSince1970: TimeInterval(schedule.end / 1000))
    guard let dayAfterEndDate = calendar.date(byAdding: .day, value: 1, to: endDate) else {
      throw VexillaSchedulingError.couldNotAddDayToEndDate
    }
    let endOfEndDate = calendar.startOfDay(for: dayAfterEndDate)

    guard startOfStartDate <= now && endOfEndDate >= now else {
      return false
    }

    switch schedule.timeType {
    case .none:
      return true
    case .startEnd:
      let startOfEndDate = calendar.startOfDay(for: endDate)

      let startDateTimestampWithStartTime = (startOfStartDate.timeIntervalSince1970) + Double(schedule.startTime / 1000)
      let endDateTimestampWithEndTime = (startOfEndDate.timeIntervalSince1970) + Double(schedule.endTime / 1000)

      // print("start: \(startDateTimestampWithStartTime) - now: \(nowSeconds) - end: \(endDateTimestampWithEndTime)")

      return (startDateTimestampWithStartTime ... endDateTimestampWithEndTime).contains(nowSeconds)
    case .daily:

      let todayZeroTime = calendar.startOfDay(for: now).timeIntervalSince1970

      let startTimestamp = todayZeroTime + Double(schedule.startTime / 1000)
      let endTimestamp = todayZeroTime + Double(schedule.endTime / 1000)

      if startTimestamp > endTimestamp {
        return startTimestamp <= nowSeconds || nowSeconds <= endTimestamp
      } else {
        return (startTimestamp ... endTimestamp).contains(nowSeconds)
      }
    }
  }
}
