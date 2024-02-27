import dev.vexilla.*
import kotlinx.datetime.*
import org.junit.jupiter.api.Test
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.days
import kotlin.test.*


//@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SchedulerTest {

    @Test
    fun `should be active with an empty schedule`() {
        val schedule = Schedule(
            start = 0,
            end = 0,
            timezone = "UTC",
            timeType = ScheduleTimeType.NONE,
            startTime = 0,
            endTime = 0
        )
        assertTrue(Scheduler.isScheduleActive(schedule, ScheduleType.EMPTY))
    }


    @Test
    fun `should handle start_end single day schedules`() {
        val now = Clock.System.now()
        val zeroDay = Instant.fromEpochMilliseconds(0)

        for (hour in 0..23) {

            val mockedNow =
                LocalDateTime(
                    now.toLocalDateTime(TimeZone.UTC).date,
                    LocalTime(hour, 0, 0, 0)
                ).toInstant(
                    TimeZone.UTC
                )

            val zeroDayWithMockedTime = Instant.fromEpochMilliseconds(0).plus(hour.hours)

            val beforeSchedule = Schedule(
                start = mockedNow.toEpochMilliseconds(),
                end = mockedNow.toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.START_END,
                startTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(3.hours).toEpochMilliseconds()
            )

            val isBeforeScheduleActive =
                Scheduler.isScheduleActiveWithNow(beforeSchedule, ScheduleType.GLOBAL, mockedNow)

            assertFalse(isBeforeScheduleActive, "Hour: ${hour}: Before test failed")

            val duringSchedule = Schedule(
                start = mockedNow.toEpochMilliseconds(),
                end = mockedNow.toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.START_END,
                startTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds()
            )

            val isDuringScheduleActive =
                Scheduler.isScheduleActiveWithNow(duringSchedule, ScheduleType.GLOBAL, mockedNow)

            assertTrue(isDuringScheduleActive, "Hour: ${hour}: During test failed")


            val afterSchedule = Schedule(
                start = mockedNow.toEpochMilliseconds(),
                end = mockedNow.toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.START_END,
                startTime = zeroDayWithMockedTime.minus(3.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds()
            )

            val isAfterScheduleActive = Scheduler.isScheduleActiveWithNow(afterSchedule, ScheduleType.GLOBAL, mockedNow)

            assertFalse(isAfterScheduleActive, "Hour: ${hour}: During test failed")
        }
    }

    @Test
    fun `should handle start_end multi day schedules`() {
        val now = Clock.System.now()
        val zeroDay = Instant.fromEpochMilliseconds(0)

        for (hour in 0..23) {

            val mockedNow =
                LocalDateTime(
                    now.toLocalDateTime(TimeZone.UTC).date,
                    LocalTime(hour, 0, 0, 0)
                ).toInstant(
                    TimeZone.UTC
                )

            val zeroDayWithMockedTime = Instant.fromEpochMilliseconds(0).plus(hour.hours)

            val beforeSchedule = Schedule(
                start = mockedNow.plus(1.days).toEpochMilliseconds(),
                end = mockedNow.plus(3.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.START_END,
                startTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(3.hours).toEpochMilliseconds()
            )

            val isBeforeScheduleActive =
                Scheduler.isScheduleActiveWithNow(beforeSchedule, ScheduleType.GLOBAL, mockedNow)

            assertFalse(isBeforeScheduleActive)

            val duringSchedule = Schedule(
                start = mockedNow.minus(1.days).toEpochMilliseconds(),
                end = mockedNow.plus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.START_END,
                startTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds()
            )

            val isDuringScheduleActive =
                Scheduler.isScheduleActiveWithNow(duringSchedule, ScheduleType.GLOBAL, mockedNow)

            assertTrue(isDuringScheduleActive)


            val afterSchedule = Schedule(
                start = mockedNow.minus(3.days).toEpochMilliseconds(),
                end = mockedNow.minus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.START_END,
                startTime = zeroDayWithMockedTime.minus(3.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds()
            )

            val isAfterScheduleActive = Scheduler.isScheduleActiveWithNow(afterSchedule, ScheduleType.GLOBAL, mockedNow)

            assertFalse(isAfterScheduleActive)
        }
    }


    @Test
    fun `should handle daily single day schedules`() {
        for (hour in 0..23) {
            val now = Clock.System.now().toLocalDateTime(TimeZone.UTC)

            val mockedNow =
                LocalDateTime(
                    now.date,
                    LocalTime(hour, 0)
                ).toInstant(
                    TimeZone.UTC
                )

            val zeroDayWithMockedTime = Instant.fromEpochMilliseconds(0).plus(hour.hours)

            val beforeWholeSchedule = Schedule(
                start = mockedNow.plus(1.days).toEpochMilliseconds(),
                end = mockedNow.plus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(3.hours).toEpochMilliseconds()
            )

            val isBeforeWholeScheduleActive =
                Scheduler.isScheduleActiveWithNow(beforeWholeSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isBeforeWholeScheduleActive, "Hour: ${hour}: Before whole test failed")

            val beforeSchedule = Schedule(
                start = mockedNow.toEpochMilliseconds(),
                end = mockedNow.toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(3.hours).toEpochMilliseconds()
            )

            val isBeforeScheduleActive =
                Scheduler.isScheduleActiveWithNow(beforeSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isBeforeScheduleActive, "Hour: ${hour}: Before test failed")

            val duringSchedule = Schedule(
                start = mockedNow.toEpochMilliseconds(),
                end = mockedNow.toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds()
            )

            val isDuringScheduleActive =
                Scheduler.isScheduleActiveWithNow(duringSchedule, ScheduleType.GLOBAL, mockedNow)
            assertTrue(isDuringScheduleActive, "Hour: ${hour}: During test failed")

            val afterSchedule = Schedule(
                start = mockedNow.toEpochMilliseconds(),
                end = mockedNow.toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.minus(3.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds()
            )

            val isAfterScheduleActive = Scheduler.isScheduleActiveWithNow(afterSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isAfterScheduleActive, "Hour: ${hour}: After test failed")

            val afterWholeSchedule = Schedule(
                start = mockedNow.minus(1.days).toEpochMilliseconds(),
                end = mockedNow.minus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.minus(3.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds()
            )

            val isAfterWholeScheduleActive =
                Scheduler.isScheduleActiveWithNow(afterWholeSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isAfterWholeScheduleActive, "Hour: ${hour}: After whole test failed")
        }
    }


    @Test
    fun `should handle daily multi day schedules`() {
        for (hour in 0..23) {
            val now = Clock.System.now().toLocalDateTime(TimeZone.UTC)

            val mockedNow =
                LocalDateTime(
                    now.date,
                    LocalTime(hour, 0)
                ).toInstant(
                    TimeZone.UTC
                )

            val zeroDayWithMockedTime = Instant.fromEpochMilliseconds(0).plus(hour.hours)

            val beforeWholeSchedule = Schedule(
                start = mockedNow.plus(1.days).toEpochMilliseconds(),
                end = mockedNow.plus(3.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(3.hours).toEpochMilliseconds()
            )

            val isBeforeWholeScheduleActive =
                Scheduler.isScheduleActiveWithNow(beforeWholeSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isBeforeWholeScheduleActive, "Hour: ${hour}: Before whole test failed")

            val beforeSchedule = Schedule(
                start = mockedNow.minus(1.days).toEpochMilliseconds(),
                end = mockedNow.plus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(3.hours).toEpochMilliseconds()
            )

            val isBeforeScheduleActive =
                Scheduler.isScheduleActiveWithNow(beforeSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isBeforeScheduleActive, "Hour: ${hour}: Before test failed")

            val duringSchedule = Schedule(
                start = mockedNow.minus(1.days).toEpochMilliseconds(),
                end = mockedNow.plus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.plus(1.hours).toEpochMilliseconds()
            )

            val isDuringScheduleActive =
                Scheduler.isScheduleActiveWithNow(duringSchedule, ScheduleType.GLOBAL, mockedNow)
            assertTrue(isDuringScheduleActive, "Hour: ${hour}: During test failed")

            val afterSchedule = Schedule(
                start = mockedNow.minus(1.days).toEpochMilliseconds(),
                end = mockedNow.plus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.minus(3.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds()
            )

            val isAfterScheduleActive = Scheduler.isScheduleActiveWithNow(afterSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isAfterScheduleActive, "Hour: ${hour}: After test failed")

            val afterWholeSchedule = Schedule(
                start = mockedNow.minus(3.days).toEpochMilliseconds(),
                end = mockedNow.minus(1.days).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = zeroDayWithMockedTime.minus(3.hours).toEpochMilliseconds(),
                endTime = zeroDayWithMockedTime.minus(1.hours).toEpochMilliseconds()
            )

            val isAfterWholeScheduleActive =
                Scheduler.isScheduleActiveWithNow(afterWholeSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isAfterWholeScheduleActive, "Hour: ${hour}: After whole test failed")
        }
    }
}