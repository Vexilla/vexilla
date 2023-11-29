import arrow
from .types import Feature, Schedule, ScheduleType, ScheduleTimeType


class Scheduler:
    @staticmethod
    def is_scheduled_feature_active(feature: Feature) -> bool:
        return Scheduler.is_scheduled_feature_active(
            feature.schedule, feature.schedule_type
        )

    @staticmethod
    def is_schedule_active(schedule: Schedule, schedule_type: ScheduleType) -> bool:
        return Scheduler.is_scheduled_feature_active_with_now(
            schedule, schedule_type, int(arrow.utcnow().timestamp() * 1000)
        )

    @staticmethod
    def is_scheduled_feature_active_with_now(
        schedule: Schedule, schedule_type: ScheduleType, now: int
    ) -> bool:
        return True
