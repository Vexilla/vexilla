import Foundation

func isScheduledFeatureActive(feature: Feature) throws -> Bool {
    try isScheduleActive(schedule: feature.schedule, scheduleType: feature.scheduleType)
}
func isScheduleActive(schedule: Schedule, scheduleType: ScheduleType) throws -> Bool {
    try isScheduleActiveWithNow(schedule: schedule, scheduleType: scheduleType, now: Date())
}
func isScheduleActiveWithNow(schedule: Schedule, scheduleType: ScheduleType, now: Date) throws -> Bool {
    let millis = floor(now.timeIntervalSince1970 * 1000)
    guard millis.isFinite, millis >= Double(Int64.min), millis < Double(Int64.max) else {
        throw VexillaError("validation", "Unrepresentable explicit clock")
    }
    return isScheduleActiveMillis(schedule: schedule, scheduleType: scheduleType, now: Int64(millis))
}
func isScheduleActiveMillis(schedule: Schedule, scheduleType: ScheduleType, now: Int64) -> Bool {
    if scheduleType == .empty { return true }
    let day: Int64 = 86400000
    func mod(_ value: Int64) -> Int64 { ((value % day) + day) % day }
    func start(_ value: Int) -> Int64 { Int64(value) - mod(Int64(value)) }
    if now < start(schedule.start) || now > start(schedule.end) + day - 1 { return false }
    switch schedule.timeType {
    case .none: return true
    case .startEnd: return now >= start(schedule.start) + Int64(schedule.startTime) && now <= start(schedule.end) + Int64(schedule.endTime)
    case .daily:
        let clock = mod(now); let first = mod(Int64(schedule.startTime)); let last = mod(Int64(schedule.endTime))
        return first <= last ? clock >= first && clock <= last : clock >= first || clock <= last
    }
}
