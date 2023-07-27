use crate::types::*;
use chrono::prelude::*;

pub fn is_scheduled_feature_active(feature: Feature) -> bool {
    match feature {
        Feature::Toggle(feature) => {
            safe_is_schedule_active(feature.schedule, feature.schedule_type)
        }
        Feature::Gradual(feature) => {
            safe_is_schedule_active(feature.schedule, feature.schedule_type)
        }
        Feature::Selective(feature) => match feature {
            SelectiveFeature::String {
                schedule,
                schedule_type,
                ..
            } => safe_is_schedule_active(schedule, schedule_type),
            SelectiveFeature::Number(feature) => match feature {
                SelectiveFeatureNumber::Int {
                    schedule,
                    schedule_type,
                    ..
                } => safe_is_schedule_active(schedule, schedule_type),

                SelectiveFeatureNumber::Float {
                    schedule,
                    schedule_type,
                    ..
                } => safe_is_schedule_active(schedule, schedule_type),
            },
        },
        Feature::Value(feature) => match feature {
            ValueFeature::String {
                schedule,
                schedule_type,
                ..
            } => safe_is_schedule_active(schedule, schedule_type),
            ValueFeature::Number(feature) => match feature {
                ValueFeatureNumber::Int {
                    schedule,
                    schedule_type,
                    ..
                } => safe_is_schedule_active(schedule, schedule_type),

                ValueFeatureNumber::Float {
                    schedule,
                    schedule_type,
                    ..
                } => safe_is_schedule_active(schedule, schedule_type),
            },
        },
    }
}

pub fn safe_is_schedule_active(schedule: VexillaSchedule, schedule_type: ScheduleType) -> bool {
    let now = Utc::now();
    safe_is_schedule_active_with_now(schedule, schedule_type, now)
}

pub fn safe_is_schedule_active_with_now(
    schedule: VexillaSchedule,
    schedule_type: ScheduleType,
    now: DateTime<Utc>,
) -> bool {
    match is_schedule_active_with_now(schedule, schedule_type, now) {
        Some(result) => result,
        _ => false,
    }
}

pub fn is_schedule_active_with_now(
    schedule: VexillaSchedule,
    schedule_type: ScheduleType,
    now: DateTime<Utc>,
) -> Option<bool> {
    match (schedule_type, schedule.time_type) {
        (ScheduleType::Empty, _) => Some(true),
        (ScheduleType::Global, _) | (ScheduleType::Environment, _) => {
            let start_date = Utc
                .timestamp_millis_opt(schedule.start)
                .earliest()?
                .with_hour(0)?
                .with_minute(0)?
                .with_second(0)?
                .with_nanosecond(0)?;

            let end_date = Utc
                .timestamp_millis_opt(schedule.end)
                .latest()?
                .with_hour(23)?
                .with_minute(59)?
                .with_second(59)?
                .with_nanosecond(999_999_999)?;

            let is_active_date = match (now.gt(&start_date), now.lt(&end_date)) {
                (true, true) => true,
                (_, _) => false,
            };

            match (is_active_date, schedule.time_type) {
                (true, ScheduleTimeType::None) => Some(true),
                (true, ScheduleTimeType::StartEnd) => {
                    let start_time = Utc.timestamp_millis_opt(schedule.start_time).earliest()?;

                    let end_time = Utc.timestamp_millis_opt(schedule.end_time).latest()?;

                    match (
                        now.gt(&start_date
                            .with_hour(start_time.hour())?
                            .with_minute(start_time.minute())?
                            .with_second(start_time.second())?
                            .with_nanosecond(start_time.nanosecond())?),
                        now.lt(&end_date
                            .with_hour(end_time.hour())?
                            .with_minute(end_time.minute())?
                            .with_second(end_time.second())?
                            .with_nanosecond(end_time.nanosecond())?),
                    ) {
                        (true, true) => Some(true),
                        (_, _) => Some(false),
                    }
                }
                (true, ScheduleTimeType::Daily) => {
                    let zero_day = Utc.timestamp_millis_opt(0).earliest()?;
                    let start_time = Utc.timestamp_millis_opt(schedule.start_time).earliest()?;
                    let end_time = Utc.timestamp_millis_opt(schedule.end_time).latest()?;

                    let now_millis = now.timestamp_millis();

                    let today_zero_timestamp = now
                        .with_hour(0)?
                        .with_minute(0)?
                        .with_second(0)?
                        .with_nanosecond(0)?
                        .timestamp_millis();

                    let zeroed_start_timestamp = zero_day
                        .with_hour(start_time.hour())?
                        .with_minute(start_time.minute())?
                        .with_second(start_time.second())?
                        .with_nanosecond(start_time.nanosecond())?
                        .timestamp_millis();

                    let zeroed_end_timestamp = zero_day
                        .with_hour(end_time.hour())?
                        .with_minute(end_time.minute())?
                        .with_second(end_time.second())?
                        .with_nanosecond(end_time.nanosecond())?
                        .timestamp_millis();

                    let zeroed_end_timestamp_plus_day = zero_day
                        .with_day(zero_day.day() + 1)?
                        .with_hour(end_time.hour())?
                        .with_minute(end_time.minute())?
                        .with_second(end_time.second())?
                        .with_nanosecond(end_time.nanosecond())?
                        .timestamp_millis();

                    let start = today_zero_timestamp + zeroed_start_timestamp;
                    let end = if zeroed_start_timestamp < zeroed_end_timestamp {
                        println!("happy path");
                        today_zero_timestamp + zeroed_end_timestamp
                    } else {
                        println!("plus a day");
                        today_zero_timestamp + zeroed_end_timestamp_plus_day
                    };
                    println!(
                        "
                            now: {},
                            start: {},
                            end: {},
                        ",
                        now.timestamp_millis(),
                        start,
                        end
                    );
                    Some(now_millis > start && now_millis < end)
                }
                (_, _) => Some(false),
            }
        }
    }
}

#[cfg(test)]
mod tests {
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

        assert_eq!(active, true);
    }

    #[test]
    fn safe_is_schedule_active_start_end() {
        let now = Utc::now();

        let before_schedule = VexillaSchedule {
            start: (now + Duration::days(1)).timestamp_millis(),
            end: (now + Duration::days(2)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::None,
            start_time: 0,
            end_time: 0,
        };

        let during_schedule = VexillaSchedule {
            start: (now - Duration::days(1)).timestamp_millis(),
            end: (now + Duration::days(1)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::None,
            start_time: 0,
            end_time: 0,
        };

        let after_schedule = VexillaSchedule {
            start: (now - Duration::days(2)).timestamp_millis(),
            end: (now - Duration::days(1)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::None,
            start_time: 0,
            end_time: 0,
        };

        let before_schedule_active = safe_is_schedule_active(before_schedule, ScheduleType::Global);

        let during_schedule_active = safe_is_schedule_active(during_schedule, ScheduleType::Global);

        let after_schedule_active = safe_is_schedule_active(after_schedule, ScheduleType::Global);

        assert_eq!(before_schedule_active, false);
        assert_eq!(during_schedule_active, true);
        assert_eq!(after_schedule_active, false);
    }

    #[test]
    fn safe_is_schedule_active_daily() {
        println!("Testing now");
        let now = Utc::now();
        safe_is_schedule_active_daily_with_now(now);

        println!("Testing today_at_9am");
        let today_at_9am = now
            .with_hour(9)
            .unwrap()
            .with_minute(0)
            .unwrap()
            .with_second(0)
            .unwrap()
            .with_nanosecond(0)
            .unwrap();
        safe_is_schedule_active_daily_with_now(today_at_9am);

        println!("Testing today_at_1130pm");
        let today_at_1130pm = now
            .with_hour(23)
            .unwrap()
            .with_minute(30)
            .unwrap()
            .with_second(0)
            .unwrap()
            .with_nanosecond(0)
            .unwrap();
        safe_is_schedule_active_daily_with_now(today_at_1130pm);
    }

    fn safe_is_schedule_active_daily_with_now(now: DateTime<Utc>) {
        let before_whole_schedule = VexillaSchedule {
            start: (now + Duration::days(1)).timestamp_millis(),
            end: (now + Duration::days(2)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::Daily,
            start_time: 0,
            end_time: 0,
        };

        let before_day_schedule = VexillaSchedule {
            start: (now - Duration::days(1)).timestamp_millis(),
            end: (now + Duration::days(1)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::Daily,
            start_time: (now + Duration::hours(1)).timestamp_millis(),
            end_time: (now + Duration::hours(2)).timestamp_millis(),
        };

        let during_schedule = VexillaSchedule {
            start: (now - Duration::days(1)).timestamp_millis(),
            end: (now + Duration::days(1)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::Daily,
            start_time: (now - Duration::hours(1)).timestamp_millis(),
            end_time: (now + Duration::hours(1)).timestamp_millis(),
        };

        println!(
            "DURING
            now: {},
            start:{},
            end: {},
            start_time: {},
            end_time: {}",
            now.timestamp_millis(),
            (now - Duration::days(1)).timestamp_millis(),
            (now + Duration::days(1)).timestamp_millis(),
            (now - Duration::hours(1)).timestamp_millis(),
            (now + Duration::hours(1)).timestamp_millis()
        );

        let after_day_schedule = VexillaSchedule {
            start: (now - Duration::days(1)).timestamp_millis(),
            end: (now + Duration::days(1)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::Daily,
            start_time: (now + Duration::hours(1)).timestamp_millis(),
            end_time: (now + Duration::hours(2)).timestamp_millis(),
        };

        let after_whole_schedule = VexillaSchedule {
            start: (now - Duration::days(2)).timestamp_millis(),
            end: (now - Duration::days(1)).timestamp_millis(),
            timezone: "UTC".to_string(),
            time_type: ScheduleTimeType::Daily,
            start_time: (now - Duration::hours(1)).timestamp_millis(),
            end_time: (now + Duration::hours(1)).timestamp_millis(),
        };

        let before_whole_schedule_active =
            safe_is_schedule_active_with_now(before_whole_schedule, ScheduleType::Global, now);
        let before_day_schedule_active =
            safe_is_schedule_active_with_now(before_day_schedule, ScheduleType::Global, now);

        let during_schedule_active =
            safe_is_schedule_active_with_now(during_schedule, ScheduleType::Global, now);

        let after_whole_schedule_active =
            safe_is_schedule_active_with_now(after_whole_schedule, ScheduleType::Global, now);
        let after_day_schedule_active =
            safe_is_schedule_active_with_now(after_day_schedule, ScheduleType::Global, now);

        println!("before_whole_schedule_active");
        assert_eq!(before_whole_schedule_active, false);
        println!("before_day_schedule_active");
        assert_eq!(before_day_schedule_active, false);
        println!("during_schedule_active");
        assert_eq!(during_schedule_active, true);
        println!("after_day_schedule_active");
        assert_eq!(after_day_schedule_active, false);
        println!("after_whole_schedule_active");
        assert_eq!(after_whole_schedule_active, false);
    }
}
