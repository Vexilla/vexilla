import Foundation

func isScheduledFeatureActive(feature: Feature) throws -> Bool {
    try isScheduleActive(schedule: feature.schedule, scheduleType: feature.scheduleType)
}
func isScheduleActive(schedule: Schedule, scheduleType: ScheduleType) throws -> Bool {
    try isScheduleActiveWithNow(schedule: schedule, scheduleType: scheduleType, now: Date())
}
func isScheduleActiveWithNow(schedule: Schedule, scheduleType: ScheduleType, now currentTime: Date)
    throws -> Bool
{
    let millis = floor(currentTime.timeIntervalSince1970 * 1000)
    guard millis.isFinite, millis >= Double(Int64.min), millis < Double(Int64.max) else {
        throw VexillaError("validation", "Unrepresentable explicit clock")
    }
    return isScheduleActiveMillis(
        schedule: schedule, scheduleType: scheduleType, now: Int64(millis))
}
func isScheduleActiveMillis(schedule: Schedule, scheduleType: ScheduleType, now currentTime: Int64)
    -> Bool
{
    if scheduleType == .empty { return true }
    let day: Int64 = 86_400_000
    func mod(_ value: Int64) -> Int64 { ((value % day) + day) % day }
    func start(_ value: Int) -> Int64 { Int64(value) - mod(Int64(value)) }
    if currentTime < start(schedule.start) || currentTime > start(schedule.end) + day - 1 {
        return false
    }
    switch schedule.timeType {
    case .none: return true
    case .startEnd:
        return currentTime >= start(schedule.start) + Int64(schedule.startTime)
            && currentTime <= start(schedule.end) + Int64(schedule.endTime)
    case .daily:
        let clock = mod(currentTime)
        let first = mod(Int64(schedule.startTime))
        let last = mod(Int64(schedule.endTime))
        return first <= last ? clock >= first && clock <= last : clock >= first || clock <= last
    }
}
