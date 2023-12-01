import unittest

import arrow
from arrow import Arrow
from vexilla_client.scheduler import Scheduler
from vexilla_client.types import Schedule, ScheduleType, ScheduleTimeType

class TestScheduler(unittest.TestCase):

    def test_schedule_active_none(self):
        """
        Test that a ScheduleType.None returns true
        """

        none_schedule = Schedule(
            start=0,
            end=0,
            timezone="UTC",
            timeType=ScheduleTimeType.NONE,
            startTime=0,
            endTime=0,
        )

        schedule_active = Scheduler.is_schedule_active(none_schedule, ScheduleType.EMPTY)

        self.assertTrue(schedule_active)

    def test_schedule_active_start_end(self):
        """
        Test that a ScheduleType.START_END returns accurate results
        """
        now = arrow.utcnow()

        before_schedule = Schedule(
            start=int(now.shift(days=1).timestamp()),
            end=int(now.shift(days=2).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.START_END,
            startTime=0,
            endTime=0,
        )

        before_schedule_active = Scheduler.is_schedule_active(before_schedule, ScheduleType.GLOBAL)

        self.assertFalse(before_schedule_active)

        during_schedule = Schedule(
            start=int(now.shift(days=-1).timestamp()),
            end=int(now.shift(days=1).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.START_END,
            startTime=0,
            endTime=0,
        )

        during_schedule_active = Scheduler.is_schedule_active(during_schedule, ScheduleType.GLOBAL)

        self.assertTrue(during_schedule_active)

        after_schedule = Schedule(
            start=int(now.shift(days=-2).timestamp()),
            end=int(now.shift(days=-1).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.START_END,
            startTime=0,
            endTime=0,
        )

        after_schedule_active = Scheduler.is_schedule_active(after_schedule, ScheduleType.GLOBAL)

        self.assertFalse(after_schedule_active)


    def test_schedule_active_daily(self):
        """
        Test that a ScheduleType.DAILY returns accurate results
        """
        now = arrow.utcnow()

        before_whole_schedule = Schedule(
            start=int(now.shift(days=1).timestamp()),
            end=int(now.shift(days=2).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.DAILY,
            startTime=0,
            endTime=0,
        )

        before_whole_schedule_active = Scheduler.is_schedule_active(before_whole_schedule, ScheduleType.GLOBAL)

        self.assertFalse(before_whole_schedule_active)

        before_day_schedule = Schedule(
            start=int(now.shift(days=-1).timestamp()),
            end=int(now.shift(days=1).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.DAILY,
            startTime=int(now.shift(hours=1).timestamp()),
            endTime=int(now.shift(hours=2).timestamp()),
        )

        before_day_schedule_active = Scheduler.is_schedule_active(before_day_schedule, ScheduleType.GLOBAL)

        self.assertFalse(before_day_schedule_active)

        during_schedule = Schedule(
            start=int(now.shift(days=-1).timestamp()),
            end=int(now.shift(days=1).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.DAILY,
            startTime=int(now.shift(hours=-1).timestamp()),
            endTime=int(now.shift(hours=1).timestamp()),
        )

        during_schedule_active = Scheduler.is_schedule_active(during_schedule, ScheduleType.GLOBAL)

        self.assertTrue(during_schedule_active)

        after_day_schedule = Schedule(
            start=int(now.shift(days=-1).timestamp()),
            end=int(now.shift(days=1).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.DAILY,
            startTime=int(now.shift(hours=-2).timestamp()),
            endTime=int(now.shift(hours=-1).timestamp()),
        )

        after_day_schedule_active = Scheduler.is_schedule_active(after_day_schedule, ScheduleType.GLOBAL)

        self.assertFalse(after_day_schedule_active)

        after_whole_schedule = Schedule(
            start=int(now.shift(days=-2).timestamp()),
            end=int(now.shift(days=-1).timestamp()),
            timezone="UTC",
            timeType=ScheduleTimeType.DAILY,
            startTime=0,
            endTime=0,
        )

        after_whole_schedule_active = Scheduler.is_schedule_active(after_whole_schedule, ScheduleType.GLOBAL)

        self.assertFalse(after_whole_schedule_active)

if __name__ == "__main__":
    unittest.main()
