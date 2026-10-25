use crate::types::*;
use chrono::prelude::*;

pub fn is_scheduled_feature_active(feature: &Feature) -> bool {
    let (schedule, kind) = match feature {
        Feature::Toggle(f) => (&f.schedule, &f.schedule_type),
        Feature::Gradual(f) => (&f.schedule, &f.schedule_type),
        Feature::Selective(SelectiveFeature::String {
            schedule,
            schedule_type,
            ..
        })
        | Feature::Selective(SelectiveFeature::Number(SelectiveFeatureNumber::Int {
            schedule,
            schedule_type,
            ..
        }))
        | Feature::Selective(SelectiveFeature::Number(SelectiveFeatureNumber::Float {
            schedule,
            schedule_type,
            ..
        }))
        | Feature::Value(ValueFeature::String {
            schedule,
            schedule_type,
            ..
        })
        | Feature::Value(ValueFeature::Number(ValueFeatureNumber::Int {
            schedule,
            schedule_type,
            ..
        }))
        | Feature::Value(ValueFeature::Number(ValueFeatureNumber::Float {
            schedule,
            schedule_type,
            ..
        })) => (schedule, schedule_type),
    };
    is_schedule_active_millis(schedule, kind, Utc::now().timestamp_millis())
}
#[cfg(test)]
pub fn safe_is_schedule_active(schedule: VexillaSchedule, schedule_type: ScheduleType) -> bool {
    is_schedule_active_millis(&schedule, &schedule_type, Utc::now().timestamp_millis())
}
#[cfg(test)]
pub fn safe_is_schedule_active_with_now(
    schedule: VexillaSchedule,
    schedule_type: ScheduleType,
    now: DateTime<Utc>,
) -> bool {
    is_schedule_active_with_now(schedule, schedule_type, now).unwrap_or(false)
}
#[cfg(test)]
pub fn is_schedule_active_with_now(
    schedule: VexillaSchedule,
    schedule_type: ScheduleType,
    now: DateTime<Utc>,
) -> Option<bool> {
    Some(is_schedule_active_millis(
        &schedule,
        &schedule_type,
        now.timestamp_millis(),
    ))
}
pub fn is_schedule_active_millis(
    schedule: &VexillaSchedule,
    schedule_type: &ScheduleType,
    now: i64,
) -> bool {
    const DAY: i64 = 86400000;
    if matches!(schedule_type, ScheduleType::Empty) {
        return true;
    }
    let start = schedule.start.div_euclid(DAY) * DAY;
    let end = schedule.end.div_euclid(DAY) * DAY;
    if now < start || now > end + DAY - 1 {
        return false;
    }
    match schedule.time_type {
        ScheduleTimeType::None => true,
        ScheduleTimeType::StartEnd => {
            start + schedule.start_time <= now && now <= end + schedule.end_time
        }
        ScheduleTimeType::Daily => {
            let (start, end, time) = (
                schedule.start_time.rem_euclid(DAY),
                schedule.end_time.rem_euclid(DAY),
                now.rem_euclid(DAY),
            );
            if start <= end {
                start <= time && time <= end
            } else {
                start <= time || time <= end
            }
        }
    }
}

#[cfg(test)]
mod scheduling_tests {
    use chrono::Duration;

    use super::*;

    #[test]
    fn safe_is_schedule_active_none() {
        let schedule = VexillaSchedule {
            start: 0,
            end: 0,
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::None,
            start_time: 0,
            end_time: 0,
        };

        let active = safe_is_schedule_active(schedule, ScheduleType::Empty);

        assert!(active);
    }

    #[test]
    fn safe_is_schedule_active_start_end_single_day() {
        let now = Utc::now();
        let zero_day = Utc.timestamp_millis_opt(0).earliest().unwrap();

        for hour in 0..24 {
            let mocked_now = now
                .with_hour(hour)
                .unwrap()
                .with_minute(0)
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            let before_schedule = VexillaSchedule {
                start: mocked_now.timestamp_millis(),
                end: mocked_now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) + 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) + 3)).timestamp_millis(),
            };

            let before_schedule_active =
                safe_is_schedule_active_with_now(before_schedule, ScheduleType::Global, mocked_now);
            assert!(!before_schedule_active);

            let during_schedule = VexillaSchedule {
                start: mocked_now.timestamp_millis(),
                end: mocked_now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) - 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) + 1)).timestamp_millis(),
            };

            let during_schedule_active =
                safe_is_schedule_active_with_now(during_schedule, ScheduleType::Global, mocked_now);
            assert!(during_schedule_active);

            let after_schedule = VexillaSchedule {
                start: mocked_now.timestamp_millis(),
                end: mocked_now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) - 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) - 3)).timestamp_millis(),
            };

            let after_schedule_active =
                safe_is_schedule_active_with_now(after_schedule, ScheduleType::Global, mocked_now);
            assert!(!after_schedule_active);
        }
    }

    #[test]
    fn safe_is_schedule_active_start_end_multi_day() {
        let now = Utc::now();
        let zero_day = Utc.timestamp_millis_opt(0).earliest().unwrap();

        for hour in 0..24 {
            let mocked_now = now
                .with_hour(hour)
                .unwrap()
                .with_minute(0)
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            let before_schedule = VexillaSchedule {
                start: (mocked_now).timestamp_millis(),
                end: (mocked_now + Duration::days(3)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) + 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) + 3)).timestamp_millis(),
            };

            let before_schedule_active =
                safe_is_schedule_active_with_now(before_schedule, ScheduleType::Global, mocked_now);
            assert!(!before_schedule_active);

            let during_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now + Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) - 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) + 1)).timestamp_millis(),
            };

            let during_schedule_active =
                safe_is_schedule_active_with_now(during_schedule, ScheduleType::Global, mocked_now);
            assert!(during_schedule_active);

            let after_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(3)).timestamp_millis(),
                end: (mocked_now).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) - 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) - 3)).timestamp_millis(),
            };

            let after_schedule_active =
                safe_is_schedule_active_with_now(after_schedule, ScheduleType::Global, mocked_now);
            assert!(!after_schedule_active);
        }
    }

    #[test]
    fn safe_is_schedule_active_daily_single_day() {
        let now = Utc::now();
        let zero_day = Utc.timestamp_millis_opt(0).earliest().unwrap();

        for hour in 0..24 {
            let mocked_now = now
                .with_hour(hour)
                .unwrap()
                .with_minute(0)
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            let zero_day_with_mocked_time = zero_day
                .with_hour(hour)
                .unwrap()
                .with_minute(0)
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            let before_whole_schedule = VexillaSchedule {
                start: (mocked_now + Duration::days(1)).timestamp_millis(),
                end: (mocked_now + Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time - Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
            };

            let before_whole_schedule_active = safe_is_schedule_active_with_now(
                before_whole_schedule,
                ScheduleType::Global,
                mocked_now,
            );

            assert!(!before_whole_schedule_active);

            let before_day_schedule = VexillaSchedule {
                start: mocked_now.timestamp_millis(),
                end: mocked_now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(3)).timestamp_millis(),
            };

            let before_day_schedule_active = safe_is_schedule_active_with_now(
                before_day_schedule,
                ScheduleType::Global,
                mocked_now,
            );
            assert!(!before_day_schedule_active);

            let during_schedule = VexillaSchedule {
                start: mocked_now.timestamp_millis(),
                end: mocked_now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time - Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
            };

            let during_schedule_active =
                safe_is_schedule_active_with_now(during_schedule, ScheduleType::Global, mocked_now);

            assert!(during_schedule_active);

            let after_day_schedule = VexillaSchedule {
                start: mocked_now.timestamp_millis(),
                end: mocked_now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(3)).timestamp_millis(),
            };

            let after_day_schedule_active = safe_is_schedule_active_with_now(
                after_day_schedule,
                ScheduleType::Global,
                mocked_now,
            );
            assert!(!after_day_schedule_active);

            let after_whole_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now - Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time - Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
            };

            let after_whole_schedule_active = safe_is_schedule_active_with_now(
                after_whole_schedule,
                ScheduleType::Global,
                mocked_now,
            );

            assert!(!after_whole_schedule_active);
        }
    }

    #[test]
    fn safe_is_schedule_active_daily_multi_day() {
        let now = Utc::now();
        let zero_day = Utc.timestamp_millis_opt(0).earliest().unwrap();

        for hour in 0..24 {
            let mocked_now = now
                .with_hour(hour)
                .unwrap()
                .with_minute(0)
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            let zero_day_with_mocked_time = zero_day
                .with_hour(hour)
                .unwrap()
                .with_minute(0)
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            let before_whole_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now - Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time - Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
            };

            let before_whole_schedule_active = safe_is_schedule_active_with_now(
                before_whole_schedule,
                ScheduleType::Global,
                mocked_now,
            );
            assert!(!before_whole_schedule_active);

            let before_day_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now + Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(3)).timestamp_millis(),
            };

            let before_day_schedule_active = safe_is_schedule_active_with_now(
                before_day_schedule,
                ScheduleType::Global,
                mocked_now,
            );
            assert!(!before_day_schedule_active);

            let during_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now + Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time - Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
            };

            let during_schedule_active =
                safe_is_schedule_active_with_now(during_schedule, ScheduleType::Global, mocked_now);
            assert!(during_schedule_active);

            let after_day_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now + Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(3)).timestamp_millis(),
            };

            let after_day_schedule_active = safe_is_schedule_active_with_now(
                after_day_schedule,
                ScheduleType::Global,
                mocked_now,
            );
            assert!(!after_day_schedule_active);

            let after_whole_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now - Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (zero_day_with_mocked_time - Duration::hours(1)).timestamp_millis(),
                end_time: (zero_day_with_mocked_time + Duration::hours(1)).timestamp_millis(),
            };

            let after_whole_schedule_active = safe_is_schedule_active_with_now(
                after_whole_schedule,
                ScheduleType::Global,
                mocked_now,
            );
            assert!(!after_whole_schedule_active);
        }
    }
}
