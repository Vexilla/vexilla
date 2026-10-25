import time
from .types import Feature, Schedule, ScheduleType, ScheduleTimeType

DAY = 86400000


class Scheduler:
    @staticmethod
    def is_scheduled_feature_active(feature: Feature) -> bool:
        return Scheduler.is_schedule_active(feature.schedule, feature.schedule_type)

    @staticmethod
    def is_schedule_active(schedule: Schedule, schedule_type: ScheduleType) -> bool:
        return Scheduler.is_schedule_active_with_now(
            schedule, schedule_type, int(time.time() * 1000)
        )

    @staticmethod
    def is_schedule_active_with_now(
        schedule: Schedule, schedule_type: ScheduleType, now: int
    ) -> bool:
        if schedule_type == ScheduleType.EMPTY:
            return True
        start, end = schedule.start // DAY * DAY, schedule.end // DAY * DAY
        if now < start or now > end + DAY - 1:
            return False
        if schedule.time_type == ScheduleTimeType.NONE:
            return True
        if schedule.time_type == ScheduleTimeType.START_END:
            return start + schedule.start_time <= now <= end + schedule.end_time
        start_time, end_time, current = (
            schedule.start_time % DAY,
            schedule.end_time % DAY,
            now % DAY,
        )
        if start_time <= end_time:
            return start_time <= current <= end_time
        return current >= start_time or current <= end_time
