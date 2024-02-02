package dev.vexilla

import kotlinx.datetime.*

object Scheduler {

    fun isScheduledFeatureActive(feature: Feature): Boolean {
        return isScheduleActive(feature.schedule, feature.scheduleType)
    }

    fun isScheduleActive(schedule: Schedule, scheduleType: ScheduleType): Boolean {
        return isScheduleActiveWithNow(schedule, scheduleType, Clock.System.now())
    }

    fun isScheduleActiveWithNow(schedule: Schedule, scheduleType: ScheduleType, now: Instant): Boolean {

        when (scheduleType) {
            ScheduleType.EMPTY -> return true
            ScheduleType.GLOBAL,
            ScheduleType.ENVIRONMENT -> {
                val startDate = Instant.fromEpochMilliseconds(schedule.start)
                val startOfStartDate =
                    LocalDateTime(
                        startDate.toLocalDateTime(TimeZone.UTC).date,
                        LocalTime(0, 0)
                    ).toInstant(
                        TimeZone.UTC
                    )

                val endDate = Instant.fromEpochMilliseconds(schedule.end)
                val endOfEndDate =
                    LocalDateTime(
                        endDate.toLocalDateTime(TimeZone.UTC).date,
                        LocalTime(23, 59, 59, 999_999_999)
                    ).toInstant(
                        TimeZone.UTC
                    )

                if (!(startOfStartDate..endOfEndDate).contains(now)) {
                    return false
                }

                val startTime = Instant.fromEpochMilliseconds(schedule.startTime).toLocalDateTime(TimeZone.UTC)
                val endTime = Instant.fromEpochMilliseconds(schedule.endTime).toLocalDateTime(TimeZone.UTC)

                when (schedule.timeType) {
                    ScheduleTimeType.NONE -> return true
                    ScheduleTimeType.START_END -> {
                        val startDateTime = LocalDateTime(
                            startDate.toLocalDateTime(TimeZone.UTC).date,
                            LocalTime(
                                startTime.hour,
                                startTime.minute,
                                startTime.second,
                                startTime.nanosecond
                            )
                        ).toInstant(TimeZone.UTC)

                        val endDateTime = LocalDateTime(
                            endDate.toLocalDateTime(TimeZone.UTC).date,
                            LocalTime(
                                endTime.hour,
                                endTime.minute,
                                endTime.second,
                                endTime.nanosecond
                            )
                        ).toInstant(TimeZone.UTC)

                        return (startDateTime..endDateTime).contains(now)
                    }

                    ScheduleTimeType.DAILY -> {
                        val zeroDay = Instant
                            .fromEpochMilliseconds(0)
                            .toLocalDateTime(TimeZone.UTC)

                        val nowTimestamp = now.epochSeconds

                        val todayZeroTime =
                            LocalDateTime(
                                now.toLocalDateTime(TimeZone.UTC).date,
                                LocalTime(0, 0)
                            ).toInstant(
                                TimeZone.UTC
                            ).epochSeconds

                        val zeroedStartTimestamp =
                            LocalDateTime(
                                zeroDay.date,
                                LocalTime(startTime.hour, startTime.minute, startTime.second, startTime.nanosecond)
                            ).toInstant(
                                TimeZone.UTC
                            ).epochSeconds

                        val zeroedEndTimestamp =
                            LocalDateTime(
                                zeroDay.date,
                                LocalTime(endTime.hour, endTime.minute, endTime.second, endTime.nanosecond)
                            ).toInstant(
                                TimeZone.UTC
                            ).epochSeconds

                        val startTimestamp = todayZeroTime + zeroedStartTimestamp
                        val endTimestamp = todayZeroTime + zeroedEndTimestamp

                        return if (zeroedStartTimestamp > zeroedEndTimestamp) {
                            nowTimestamp >= startTimestamp || nowTimestamp <= endTimestamp
                        } else {
                            (startTimestamp..endTimestamp).contains(nowTimestamp)
                        }
                    }
                }
            }

        }
    }
}