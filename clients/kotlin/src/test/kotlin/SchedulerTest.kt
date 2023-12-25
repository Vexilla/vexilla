import dev.vexilla.*
import kotlinx.datetime.*
import org.junit.jupiter.api.Test
//import java.time.Duration
import kotlin.time.Duration
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
    fun `should handle start_end schedules`() {
        val now = Clock.System.now()

        val beforeSchedule = Schedule(
            start = now.plus(1, DateTimeUnit.DAY, TimeZone.UTC).epochSeconds * 1000,
            end = now.plus(3, DateTimeUnit.DAY, TimeZone.UTC).epochSeconds * 1000,
            timezone = "UTC",
            timeType = ScheduleTimeType.START_END,
            startTime = 0,
            endTime = 0
        )

        val isBeforeScheduleActive = Scheduler.isScheduleActive(beforeSchedule, ScheduleType.GLOBAL)

        assertFalse(isBeforeScheduleActive)

        val duringSchedule = Schedule(
            start = now.minus(1, DateTimeUnit.DAY, TimeZone.UTC).epochSeconds * 1000,
            end = now.plus(1, DateTimeUnit.DAY, TimeZone.UTC).epochSeconds * 1000,
            timezone = "UTC",
            timeType = ScheduleTimeType.START_END,
            startTime = 0,
            endTime = 0
        )

        val isDuringScheduleActive = Scheduler.isScheduleActive(duringSchedule, ScheduleType.GLOBAL)

        assertTrue(isDuringScheduleActive)


        val afterSchedule = Schedule(
            start = now.minus(3, DateTimeUnit.DAY, TimeZone.UTC).epochSeconds * 1000,
            end = now.minus(1, DateTimeUnit.DAY, TimeZone.UTC).epochSeconds * 1000,
            timezone = "UTC",
            timeType = ScheduleTimeType.START_END,
            startTime = 0,
            endTime = 0
        )

        val isAfterScheduleActive = Scheduler.isScheduleActive(afterSchedule, ScheduleType.GLOBAL)

        assertFalse(isAfterScheduleActive)
    }


    @Test
    fun `should handle daily schedules`() {
        for (hour in 0..23) {
            val now = Clock.System.now().toLocalDateTime(TimeZone.UTC)

            val mockedNow =
                LocalDateTime(
                    now.date,
                    LocalTime(hour, 0)
                ).toInstant(
                    TimeZone.UTC
                )

            val beforeSchedule = Schedule(
                start = mockedNow.minus(1, DateTimeUnit.DAY, TimeZone.UTC).toEpochMilliseconds(),
                end = mockedNow.plus(1, DateTimeUnit.DAY, TimeZone.UTC).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = mockedNow.plus(1, DateTimeUnit.HOUR, TimeZone.UTC).toEpochMilliseconds(),
                endTime = mockedNow.plus(3, DateTimeUnit.HOUR, TimeZone.UTC).toEpochMilliseconds()
            )

            val isBeforeScheduleActive =
                Scheduler.isScheduleActiveWithNow(beforeSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isBeforeScheduleActive, "Hour: ${hour}: Before test failed")

            val duringSchedule = Schedule(
                start = mockedNow.minus(1, DateTimeUnit.DAY, TimeZone.UTC).toEpochMilliseconds(),
                end = mockedNow.plus(1, DateTimeUnit.DAY, TimeZone.UTC).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = mockedNow.minus(1, DateTimeUnit.HOUR, TimeZone.UTC).toEpochMilliseconds(),
                endTime = mockedNow.plus(1, DateTimeUnit.HOUR, TimeZone.UTC).toEpochMilliseconds()
            )

            val isDuringScheduleActive =
                Scheduler.isScheduleActiveWithNow(duringSchedule, ScheduleType.GLOBAL, mockedNow)
            assertTrue(isDuringScheduleActive, "Hour: ${hour}: During test failed")

            val afterSchedule = Schedule(
                start = mockedNow.minus(1, DateTimeUnit.DAY, TimeZone.UTC).toEpochMilliseconds(),
                end = mockedNow.plus(1, DateTimeUnit.DAY, TimeZone.UTC).toEpochMilliseconds(),
                timezone = "UTC",
                timeType = ScheduleTimeType.DAILY,
                startTime = mockedNow.minus(3, DateTimeUnit.HOUR, TimeZone.UTC).toEpochMilliseconds(),
                endTime = mockedNow.minus(1, DateTimeUnit.HOUR, TimeZone.UTC).toEpochMilliseconds()
            )

            val isAfterScheduleActive = Scheduler.isScheduleActiveWithNow(afterSchedule, ScheduleType.GLOBAL, mockedNow)
            assertFalse(isAfterScheduleActive, "Hour: ${hour}: After test failed")
        }
    }
}