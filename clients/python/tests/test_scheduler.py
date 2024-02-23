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

    def test_schedule_active_start_end_single_day(self):
        """
        Test that a ScheduleType.START_END returns accurate results
        """
        now = arrow.utcnow()
        zero_day = Arrow.utcfromtimestamp(0)

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

            zero_day_with_mocked_time = Arrow(
                zero_day.year,
                zero_day.month,
                zero_day.day,
                hour,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(zero_day, "fold", 0),
            )

            before_schedule = Schedule(
                start=int(mocked_now.timestamp()) * 1000,
                end=int(mocked_now.timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+3).timestamp()) * 1000,
            )

            before_schedule_active = Scheduler.is_schedule_active_with_now(
                before_schedule, ScheduleType.GLOBAL, int(mocked_now.timestamp()) * 1000
            )

            self.assertFalse(before_schedule_active)

            during_schedule = Schedule(
                start=int(mocked_now.timestamp()) * 1000,
                end=int(mocked_now.timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
            )

            during_schedule_active = Scheduler.is_schedule_active_with_now(
                during_schedule, ScheduleType.GLOBAL, int(mocked_now.timestamp()) * 1000
            )

            self.assertTrue(during_schedule_active)

            after_schedule = Schedule(
                start=int(mocked_now.timestamp()) * 1000,
                end=int(mocked_now.timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=int(zero_day_with_mocked_time.shift(hours=-3).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
            )

            after_schedule_active = Scheduler.is_schedule_active_with_now(
                after_schedule, ScheduleType.GLOBAL, int(mocked_now.timestamp()) * 1000
            )

            self.assertFalse(after_schedule_active)


    def test_schedule_active_start_end_multi_day(self):
        """
        Test that a ScheduleType.START_END returns accurate results
        """
        now = arrow.utcnow()
        zero_day = Arrow.utcfromtimestamp(0)

        for hour in range(24):
            zero_day_with_mocked_time = Arrow(
                zero_day.year,
                zero_day.month,
                zero_day.day,
                hour,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(zero_day, "fold", 0),
            )

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
                start=int(mocked_now.timestamp()) * 1000,
                end=int(mocked_now.shift(days=2).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+3).timestamp()) * 1000,
            )

            before_schedule_active = Scheduler.is_schedule_active_with_now(
                before_schedule, ScheduleType.GLOBAL, int(mocked_now.timestamp()) * 1000
            )

            self.assertFalse(before_schedule_active)

            during_schedule = Schedule(
                start=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
            )

            during_schedule_active = Scheduler.is_schedule_active_with_now(
                during_schedule, ScheduleType.GLOBAL, int(mocked_now.timestamp()) * 1000
            )

            self.assertTrue(during_schedule_active)

            after_schedule = Schedule(
                start=int(mocked_now.shift(days=-2).timestamp()) * 1000,
                end=int(mocked_now.timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.START_END,
                startTime=int(zero_day_with_mocked_time.shift(hours=-3).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
            )

            after_schedule_active = Scheduler.is_schedule_active_with_now(
                after_schedule, ScheduleType.GLOBAL, int(mocked_now.timestamp()) * 1000
            )

            self.assertFalse(after_schedule_active)

            #

    def test_schedule_active_daily_single_day(self):
        """
        Test that a ScheduleType.DAILY returns accurate results
        """
        now = arrow.utcnow()
        zero_day = Arrow.utcfromtimestamp(0)

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

            zero_day_with_mocked_time = Arrow(
                zero_day.year,
                zero_day.month,
                zero_day.day,
                hour,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(zero_day, "fold", 0),
            )

            before_day_schedule = Schedule(
                start=int(mocked_now.timestamp()) * 1000,
                end=int(mocked_now.timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+3).timestamp()) * 1000,
            )

            before_day_schedule_active = Scheduler.is_schedule_active_with_now(
                before_day_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(before_day_schedule_active)

            during_schedule = Schedule(
                start=int(mocked_now.timestamp()) * 1000,
                end=int(mocked_now.timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
            )

            during_schedule_active = Scheduler.is_schedule_active_with_now(
                during_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertTrue(during_schedule_active, f"Hour: {hour}")

            after_day_schedule = Schedule(
                start=int(mocked_now.timestamp()) * 1000,
                end=int(mocked_now.timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=-3).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
            )

            after_day_schedule_active = Scheduler.is_schedule_active_with_now(
                after_day_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(after_day_schedule_active)


    def test_schedule_active_daily_multi_day(self):
        """
        Test that a ScheduleType.DAILY returns accurate results
        """
        now = arrow.utcnow()
        zero_day = Arrow.utcfromtimestamp(0)

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

            zero_day_with_mocked_time = Arrow(
                zero_day.year,
                zero_day.month,
                zero_day.day,
                hour,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(zero_day, "fold", 0),
            )

            before_whole_schedule = Schedule(
                start=int(mocked_now.shift(days=+1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=+3).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+3).timestamp()) * 1000,
            )

            before_whole_schedule_active = Scheduler.is_schedule_active_with_now(
                before_whole_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(before_whole_schedule_active)

            before_day_schedule = Schedule(
                start=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=+1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+3).timestamp()) * 1000,
            )

            before_day_schedule_active = Scheduler.is_schedule_active_with_now(
                before_day_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(before_day_schedule_active)

            during_schedule = Schedule(
                start=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=+1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=+1).timestamp()) * 1000,
            )

            during_schedule_active = Scheduler.is_schedule_active_with_now(
                during_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertTrue(during_schedule_active, f"Hour: {hour}")

            after_day_schedule = Schedule(
                start=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                end=int(mocked_now.shift(days=+1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=-3).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
            )

            after_day_schedule_active = Scheduler.is_schedule_active_with_now(
                after_day_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(after_day_schedule_active)

            after_whole_schedule = Schedule(
                start=int(mocked_now.shift(days=-3).timestamp()) * 1000,
                end=int(mocked_now.shift(days=-1).timestamp()) * 1000,
                timezone="UTC",
                timeType=ScheduleTimeType.DAILY,
                startTime=int(zero_day_with_mocked_time.shift(hours=-3).timestamp()) * 1000,
                endTime=int(zero_day_with_mocked_time.shift(hours=-1).timestamp()) * 1000,
            )

            after_whole_schedule_active = Scheduler.is_schedule_active_with_now(
                after_whole_schedule, ScheduleType.GLOBAL, mocked_now_timestamp
            )

            self.assertFalse(after_whole_schedule_active)


if __name__ == "__main__":
    unittest.main()
