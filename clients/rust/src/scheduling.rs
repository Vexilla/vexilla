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
    let now_millis = now.timestamp_millis();

    let start_time = Utc.timestamp_millis_opt(schedule.start_time).earliest()?;
    // .timestamp_millis();

    let end_time = Utc.timestamp_millis_opt(schedule.end_time).latest()?;
    // .timestamp_millis();

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

            // LEAVING OFF on Start/End bug: This seems to be an issue, time to investigate more
            let is_active_date = match (now.ge(&start_date), now.le(&end_date)) {
                (true, true) => true,
                (_, _) => false,
            };

            match (is_active_date, schedule.time_type) {
                (true, ScheduleTimeType::None) => Some(true),
                (true, ScheduleTimeType::StartEnd) => {
                    // let start_time = Utc
                    //     .timestamp_millis_opt(schedule.start_time)
                    //     .earliest()?
                    //     .timestamp_millis();

                    // let end_time = Utc
                    //     .timestamp_millis_opt(schedule.end_time)
                    //     .latest()?
                    //     .timestamp_millis();

                    let start_date_zero_timestamp = start_date
                        .with_hour(0)?
                        .with_minute(0)?
                        .with_second(0)?
                        .with_nanosecond(0)?
                        .timestamp_millis();

                    // let end_date_zero_timestamp = end_date
                    //     .with_hour(0)?
                    //     .with_minute(0)?
                    //     .with_second(0)?
                    //     .with_nanosecond(0)?
                    //     .timestamp_millis();

                    let start_date_with_start_time = start_date
                        .with_hour(start_time.hour())?
                        .with_minute(start_time.minute())?
                        .with_second(start_time.second())?
                        .with_nanosecond(start_time.nanosecond())?
                        .timestamp_millis();

                    let end_date_with_end_time = &end_date
                        .with_hour(end_time.hour())?
                        .with_minute(end_time.minute())?
                        .with_second(end_time.second())?
                        .with_nanosecond(end_time.nanosecond())?
                        .timestamp_millis();

                    let now_timestamp = now.timestamp_millis();

                    println!("START: {start_date_with_start_time} - NOW: {now_timestamp} - END: {end_date_with_end_time}");

                    match (
                        now.ge(&start_date
                            .with_hour(start_time.hour())?
                            .with_minute(start_time.minute())?
                            .with_second(start_time.second())?
                            .with_nanosecond(start_time.nanosecond())?),
                        now.le(&end_date
                            .with_hour(end_time.hour())?
                            .with_minute(end_time.minute())?
                            .with_second(end_time.second())?
                            .with_nanosecond(end_time.nanosecond())?),
                    ) {
                        (true, true) => Some(true),
                        (_, _) => Some(false),
                    }

                    // let start = start_date_zero_timestamp + start_time;
                    // let end = end_date_zero_timestamp + end_time;
                    // if start > end {
                    //     Some(now_millis >= start || now_millis <= end)
                    // } else {
                    //     Some(now_millis >= start && now_millis <= end)
                    // }
                }
                (true, ScheduleTimeType::Daily) => {
                    let zero_day = Utc.timestamp_millis_opt(0).earliest()?;
                    let start_time = Utc.timestamp_millis_opt(schedule.start_time).earliest()?;
                    let end_time = Utc.timestamp_millis_opt(schedule.end_time).latest()?;

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

                    let start = today_zero_timestamp + zeroed_start_timestamp;
                    let end = today_zero_timestamp + zeroed_end_timestamp;
                    if start > end {
                        Some(now_millis >= start || now_millis <= end)
                    } else {
                        Some(now_millis >= start && now_millis <= end)
                    }
                }
                (_, _) => Some(false),
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
    fn safe_is_schedule_active_start_end() {
        let now = Utc::now();
        let zero_day = Utc.timestamp_millis_opt(0).earliest().unwrap();

        for hour in 0..24 {
            println!("Hour {hour}");

            let mocked_now = now
                .with_hour(hour)
                .unwrap()
                .with_minute(0)
                .unwrap()
                .with_second(0)
                .unwrap()
                .with_nanosecond(0)
                .unwrap();

            // LEAVING OFF: start_time is calculated wrong. Need to get the zero relative hour of the day differently

            let before_schedule = VexillaSchedule {
                start: now.timestamp_millis(),
                end: now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) + 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) + 3)).timestamp_millis(),
            };

            let start_time = (zero_day + Duration::hours(i64::from(hour) + 1)).timestamp_millis();
            let end_time = (zero_day + Duration::hours(i64::from(hour) + 3)).timestamp_millis();

            println!("start: {start_time} - end: {end_time}");

            let before_schedule_active =
                safe_is_schedule_active(before_schedule, ScheduleType::Global);
            assert!(!before_schedule_active);

            let during_schedule = VexillaSchedule {
                start: now.timestamp_millis(),
                end: now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) - 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) + 1)).timestamp_millis(),
            };

            let during_schedule_active =
                safe_is_schedule_active(during_schedule, ScheduleType::Global);
            assert!(during_schedule_active);

            let after_schedule = VexillaSchedule {
                start: now.timestamp_millis(),
                end: now.timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::StartEnd,
                start_time: (zero_day + Duration::hours(i64::from(hour) - 1)).timestamp_millis(),
                end_time: (zero_day + Duration::hours(i64::from(hour) - 3)).timestamp_millis(),
            };

            let after_schedule_active =
                safe_is_schedule_active(after_schedule, ScheduleType::Global);
            assert!(!after_schedule_active);
        }
    }

    #[test]
    fn safe_is_schedule_active_daily() {
        let now = Utc::now();

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

            // let before_whole_schedule = VexillaSchedule {
            //     start: (now + Duration::days(1)).timestamp_millis(),
            //     end: (now + Duration::days(3)).timestamp_millis(),
            //     timezone: "UTC".to_string(),
            //     time_type: ScheduleTimeType::Daily,
            //     start_time: 0,
            //     end_time: 0,
            // };

            // let before_whole_schedule_active = safe_is_schedule_active_with_now(
            //     before_whole_schedule,
            //     ScheduleType::Global,
            //     mocked_now,
            // );

            // assert!(!before_whole_schedule_active);

            let before_day_schedule = VexillaSchedule {
                start: (mocked_now - Duration::days(1)).timestamp_millis(),
                end: (mocked_now + Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (mocked_now + Duration::hours(1)).timestamp_millis(),
                end_time: (mocked_now + Duration::hours(3)).timestamp_millis(),
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
                start_time: (mocked_now - Duration::hours(1)).timestamp_millis(),
                end_time: (mocked_now + Duration::hours(1)).timestamp_millis(),
            };

            let during_schedule_active =
                safe_is_schedule_active_with_now(during_schedule, ScheduleType::Global, mocked_now);

            assert!(during_schedule_active);

            let after_day_schedule = VexillaSchedule {
                start: (now - Duration::days(1)).timestamp_millis(),
                end: (now + Duration::days(1)).timestamp_millis(),
                timezone: "UTC".to_string(),
                time_type: ScheduleTimeType::Daily,
                start_time: (mocked_now + Duration::hours(1)).timestamp_millis(),
                end_time: (mocked_now + Duration::hours(3)).timestamp_millis(),
            };

            let after_day_schedule_active = safe_is_schedule_active_with_now(
                after_day_schedule,
                ScheduleType::Global,
                mocked_now,
            );
            assert!(!after_day_schedule_active);

            // let after_whole_schedule = VexillaSchedule {
            //     start: (now - Duration::days(3)).timestamp_millis(),
            //     end: (now - Duration::days(1)).timestamp_millis(),
            //     timezone: "UTC".to_string(),
            //     time_type: ScheduleTimeType::Daily,
            //     start_time: (mocked_now - Duration::hours(1)).timestamp_millis(),
            //     end_time: (mocked_now + Duration::hours(1)).timestamp_millis(),
            // };

            // let after_whole_schedule_active = safe_is_schedule_active_with_now(
            //     after_whole_schedule,
            //     ScheduleType::Global,
            //     mocked_now,
            // );

            // assert!(!after_whole_schedule_active);
        }
    }
}
