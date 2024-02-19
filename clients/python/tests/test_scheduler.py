import unittest

import arrow
from arrow import Arrow
from dateutil import tz as dateutil_tz
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

        schedule_active = Scheduler.is_schedule_active(
            none_schedule, ScheduleType.EMPTY
        )

        self.assertTrue(schedule_active)

    def test_schedule_active_start_end(self):
        """
        Test that a ScheduleType.START_END returns accurate results
        """
        now = arrow.utcnow()

        for hour in range(24):

            mocked_now = Arrow(
                now.year,
                now.month,
                now.day,
                hour,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(now, "fold", 0),
            )

            before_schedule = Schedule(
                start=int(mocked_now.shift(days=1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=2).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=0,
                endTime=0,
            )

            before_schedule_active = Scheduler.is_schedule_active(
                before_schedule, ScheduleType.GLOBAL
            )

            self.assertFalse(before_schedule_active)

            during_schedule = Schedule(
                start=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=0,
                endTime=0,
            )

            during_schedule_active = Scheduler.is_schedule_active(
                during_schedule, ScheduleType.GLOBAL
            )

            self.assertTrue(during_schedule_active)

            after_schedule = Schedule(
                start=int(mocked_now.shift(days=-2).timestamp()) * 1000,
                end=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=0,
                endTime=0,
            )

            after_schedule_active = Scheduler.is_schedule_active(
                after_schedule, ScheduleType.GLOBAL
            )

            self.assertFalse(after_schedule_active)

    def test_schedule_active_daily(self):
        """
        Test that a ScheduleType.DAILY returns accurate results
        """
        now = arrow.utcnow()

        for hour in range(24):
            mocked_now = Arrow(
                now.year,
                now.month,
                now.day,
                hour,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(now, "fold", 0),
            )

            mocked_now_timestamp = mocked_now.timestamp() * 1000

            before_day_schedule = Schedule(
                start=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(mocked_now.shift(hours=1).timestamp()) * 1000,
                endTime=int(mocked_now.shift(hours=3).timestamp()) * 1000,
            )

            before_day_schedule_active = Scheduler.is_schedule_active_with_now(
                before_day_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(before_day_schedule_active)

            during_schedule = Schedule(
                start=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(mocked_now.shift(hours=-1).timestamp()) * 1000,
                endTime=int(mocked_now.shift(hours=1).timestamp()) * 1000,
            )

            during_schedule_active = Scheduler.is_schedule_active_with_now(
                during_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertTrue(during_schedule_active, f"Hour: {hour}")

            after_day_schedule = Schedule(
                start=int(now.shift(days=-1).timestamp()) * 1000,
                end=int(now.shift(days=1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(mocked_now.shift(hours=-3).timestamp()) * 1000,
                endTime=int(mocked_now.shift(hours=-1).timestamp()) * 1000,
            )

            after_day_schedule_active = Scheduler.is_schedule_active_with_now(
                after_day_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(after_day_schedule_active)


if __name__ == "__main__":
    unittest.main()
