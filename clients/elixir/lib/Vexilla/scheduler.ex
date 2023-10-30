defmodule Scheduler do
  @moduledoc """
  Documentation for `Scheduler`.
  """
  use Timex
  require ScheduleType
  require TimeType
  require FeatureType

  @doc """
  Checks if a feature's schedule is active

  ## Examples

    iex> require FeatureType
    ...>  require ScheduleType
    ...>  require TimeType
    ...>  Scheduler.is_scheduled_feature_active(Scheduler.get_example_feature())
    true

  """
  def is_scheduled_feature_active(feature) do
    is_schedule_active(feature["schedule"], feature["scheduleType"])
  end

  defp is_schedule_active(schedule, schedule_type) do
    is_schedule_active_with_now(schedule, schedule_type, Timex.now())
  end

  defp is_schedule_active_with_now(schedule, schedule_type, now) do
    schedule_type_empty = ScheduleType.empty()
    schedule_type_global = ScheduleType.global()
    schedule_type_environment = ScheduleType.environment()

    case schedule_type do
      ^schedule_type_empty ->
        true

      schedule_type when schedule_type in [schedule_type_global, schedule_type_environment] ->
        start_date = Timex.from_unix(schedule.start, :millisecond)
        start_of_start_date = Timex.set(start_date, hour: 0, minute: 0, second: 0, microsecond: 0)

        end_date = Timex.from_unix(schedule.end, :millisecond)

        end_of_end_date =
          Timex.set(end_date, hour: 23, minute: 59, second: 59, microsecond: 999_999)

        time_type_none = TimeType.none()
        time_type_start_end = TimeType.start_end()
        time_type_daily = TimeType.daily()

        start_time = Timex.from_unix(schedule.startTime, :millisecond)
        end_time = Timex.from_unix(schedule.endTime, :millisecond)

        case {schedule.timeType,
              Timex.between?(now, start_of_start_date, end_of_end_date, inclusive: true)} do
          {^time_type_none, true} ->
            true

          {^time_type_start_end, true} ->
            start_day_with_start_time =
              Timex.set(start_date,
                hour: start_time.hour,
                minute: start_time.minute,
                second: start_time.second,
                microsecond: start_time.microsecond
              )

            end_day_with_start_time =
              Timex.set(end_date,
                hour: end_time.hour,
                minute: end_time.minute,
                second: end_time.second,
                microsecond: end_time.microsecond
              )

            Timex.between?(now, start_day_with_start_time, end_day_with_start_time,
              inclusive: true
            )

          {^time_type_daily, true} ->
            zero_day = Timex.from_unix(0)
            now_timestamp = Timex.to_unix(now)

            today_zero_timestamp =
              Timex.to_unix(Timex.set(now, hour: 0, minute: 0, second: 0, microsecond: 0))

            zeroed_start_timestamp =
              Timex.set(zero_day,
                hour: start_time.hour,
                minute: start_time.minute,
                second: start_time.second,
                microsecond: start_time.microsecond
              )

            zeroed_end =
              Timex.set(zero_day,
                hour: end_time.hour,
                minute: end_time.minute,
                second: end_time.second,
                microsecond: end_time.microsecond
              )

            zeroed_end_timestamp = Timex.to_unix(zeroed_end)

            zeroed_end_timestamp_plus_day =
              Timex.to_unix(Timex.add(zeroed_end, Duration.from_days(1)))

            start_timestamp = today_zero_timestamp + zeroed_start_timestamp

            end_timestamp =
              if zeroed_start_timestamp > zeroed_end_timestamp || zeroed_end_timestamp < 0 do
                today_zero_timestamp + zeroed_end_timestamp_plus_day
              else
                today_zero_timestamp + zeroed_end_timestamp
              end

            now_timestamp >= start_timestamp && now_timestamp <= end_timestamp

          {_, false} ->
            IO.puts("Not between days")
            false
        end

      _ ->
        false
    end
  end

  if Mix.env() == :test do
    def get_example_feature() do
      now = Timex.now()

      %{
        name: "foo",
        featureId: "bar",
        seed: 0,
        value: 0,
        schedule: %Schedule{
          start: Timex.to_unix(Timex.subtract(now, Duration.from_days(2))),
          end: Timex.to_unix(Timex.add(now, Duration.from_days(2))),
          timeType: TimeType.start_end(),
          startTime: Timex.to_unix(Timex.subtract(now, Duration.from_hours(2))),
          endTime: Timex.to_unix(Timex.add(now, Duration.from_hours(2)))
        },
        featureType: FeatureType.toggle(),
        scheduleType: ScheduleType.global(),
      }
    end
  end
end
