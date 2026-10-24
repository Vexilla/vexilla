package dev.vexilla

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

object Scheduler {
    private const val DAY = 86400000L

    private fun day(value: Long): Long = Math.floorDiv(value, DAY) * DAY

    fun isScheduledFeatureActive(feature: Feature): Boolean =
        isScheduleActive(feature.schedule, feature.scheduleType)

    fun isScheduleActive(schedule: Schedule, scheduleType: ScheduleType): Boolean =
        isScheduleActiveMillis(schedule, scheduleType, Clock.System.now().toEpochMilliseconds())

    fun isScheduleActiveWithNow(
        schedule: Schedule,
        scheduleType: ScheduleType,
        now: Instant,
    ): Boolean = isScheduleActiveMillis(schedule, scheduleType, now.toEpochMilliseconds())

    fun isScheduleActiveMillis(schedule: Schedule, scheduleType: ScheduleType, now: Long): Boolean {
        if (scheduleType == ScheduleType.EMPTY) {
            return true
        }
        if (now < day(schedule.start) || now > day(schedule.end) + DAY - 1) {
            return false
        }
        return when (schedule.timeType) {
            ScheduleTimeType.NONE -> true
            ScheduleTimeType.START_END ->
                now >= day(schedule.start) + schedule.startTime &&
                    now <= day(schedule.end) + schedule.endTime
            ScheduleTimeType.DAILY -> {
                val clock = Math.floorMod(now, DAY)
                val start = Math.floorMod(schedule.startTime, DAY)
                val end = Math.floorMod(schedule.endTime, DAY)
                if (start <= end) {
                    clock >= start && clock <= end
                } else {
                    clock >= start || clock <= end
                }
            }
        }
    }
}
