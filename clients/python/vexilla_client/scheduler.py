import arrow
from arrow import Arrow
from dateutil import tz as dateutil_tz
from .types import Feature, Schedule, ScheduleType, ScheduleTimeType


class Scheduler:
    @staticmethod
    def is_scheduled_feature_active(feature: Feature) -> bool:
        return Scheduler.is_schedule_active(feature.schedule, feature.schedule_type)

    @staticmethod
    def is_schedule_active(schedule: Schedule, schedule_type: ScheduleType) -> bool:
        return Scheduler.is_schedule_active_with_now(
            schedule, schedule_type, int(arrow.utcnow().timestamp() * 1000)
        )

    @staticmethod
    def is_schedule_active_with_now(
        schedule: Schedule, schedule_type: ScheduleType, now: int
    ) -> bool:
        if schedule_type not in {ScheduleType.ENVIRONMENT, ScheduleType.GLOBAL}:
            return True

        now_datetime = Arrow.utcfromtimestamp(now / 1000)

        start_date = Arrow.utcfromtimestamp(schedule.start / 1000)
        start_of_start_date = Arrow(
            start_date.year,
            start_date.month,
            start_date.day,
            0,
            0,
            0,
            0,
            dateutil_tz.tzutc(),
            fold=getattr(start_date, "fold", 0),
        )

        end_date = Arrow.utcfromtimestamp(schedule.end / 1000)
        end_of_end_date = Arrow(
            end_date.year,
            end_date.month,
            end_date.day,
            23,
            59,
            59,
            999_999,
            dateutil_tz.tzutc(),
            fold=getattr(end_date, "fold", 0),
        )

        if not now_datetime.is_between(start_of_start_date, end_of_end_date, "[]"):
            return False

        start_time = Arrow.utcfromtimestamp(schedule.start_time / 1000)
        end_time = Arrow.utcfromtimestamp(schedule.end_time / 1000)

        if schedule.time_type is ScheduleTimeType.NONE:
            return True
        elif schedule.time_type is ScheduleTimeType.START_END:

            start_of_end_date = Arrow(
                end_date.year,
                end_date.month,
                end_date.day,
                0,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(end_date, "fold", 0),
            )

            start_date_timestamp_with_start_time = int(start_of_start_date.timestamp()) * 1000 + schedule.start_time

            end_date_timestamp_with_end_time = int(start_of_end_date.timestamp()) * 1000 + schedule.end_time

            return start_date_timestamp_with_start_time < now and end_date_timestamp_with_end_time > now

        elif schedule.time_type is ScheduleTimeType.DAILY:
            zero_day = Arrow.utcfromtimestamp(0)
            now_timestamp = now_datetime.timestamp()

            today_zero_date_time = Arrow(
                now_datetime.year,
                now_datetime.month,
                now_datetime.day,
                0,
                0,
                0,
                0,
                dateutil_tz.tzutc(),
                fold=getattr(now, "fold", 0),
            )
            today_zero_timestamp = today_zero_date_time.timestamp()

            zeroed_start_date_time = Arrow(
                zero_day.year,
                zero_day.month,
                zero_day.day,
                start_time.hour,
                start_time.minute,
                start_time.second,
                start_time.microsecond,
                dateutil_tz.tzutc(),
                fold=getattr(zero_day, "fold", 0),
            )
            zeroed_start_timestamp = zeroed_start_date_time.timestamp()

            zeroed_end_date_time = Arrow(
                zero_day.year,
                zero_day.month,
                zero_day.day,
                end_time.hour,
                end_time.minute,
                end_time.second,
                end_time.microsecond,
                dateutil_tz.tzutc(),
                fold=getattr(zero_day, "fold", 0),
            )
            zeroed_end_timestamp = zeroed_end_date_time.timestamp()

            start_timestamp = today_zero_timestamp + zeroed_start_timestamp
            end_timestamp = today_zero_timestamp + zeroed_end_timestamp

            # TODO: Is this where the Daily logic fails? Would it make sense to use our start_timestamp and subtract a day instead
            if zeroed_start_timestamp > zeroed_end_timestamp:
                return (
                    now_timestamp >= start_timestamp or now_timestamp <= end_timestamp
                )
            else:
                return (
                    now_timestamp >= start_timestamp and now_timestamp <= end_timestamp
                )

        return False
