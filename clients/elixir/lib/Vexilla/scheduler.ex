defmodule Scheduler do
  @moduledoc false

  use Timex
  require ScheduleType
  require TimeType
  require FeatureType

  @doc """
  Checks if a feature's schedule is active

  ## Examples

    iex> Scheduler.is_scheduled_feature_active(Scheduler.get_example_feature())
    true

  """
  def is_scheduled_feature_active(feature) do
    is_schedule_active(feature["schedule"], feature["scheduleType"])
  end

  def is_schedule_active(schedule, schedule_type, datetime \\ Timex.now()) do
    schedule_type_empty = ScheduleType.empty()
    schedule_type_global = ScheduleType.global()
    schedule_type_environment = ScheduleType.environment()

    case schedule_type do
      ^schedule_type_empty ->
        true

      schedule_type when schedule_type in [schedule_type_global, schedule_type_environment] ->
        start_date = Timex.from_unix(schedule["start"], :millisecond)
        start_of_start_date = Timex.beginning_of_day(start_date)

        end_date = Timex.from_unix(schedule["end"], :millisecond)
        end_of_end_date = Timex.end_of_day(end_date)

        time_type_none = TimeType.none()
        time_type_start_end = TimeType.start_end()
        time_type_daily = TimeType.daily()

        start_time = Timex.from_unix(schedule["startTime"], :millisecond)
        end_time = Timex.from_unix(schedule["endTime"], :millisecond)

        is_date_between =
          Timex.between?(datetime, start_of_start_date, end_of_end_date, inclusive: true)

        case {schedule["timeType"], is_date_between} do
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

            Timex.between?(datetime, start_day_with_start_time, end_day_with_start_time,
              inclusive: true
            )

          {^time_type_daily, true} ->
            zero_day = Timex.from_unix(0, :millisecond)
            timestamp = Timex.to_unix(datetime) * 1000

            start_of_today =
              datetime
              |> Timex.beginning_of_day()
              |> Timex.to_unix()
              |> Kernel.*(1000)

            zeroed_start_timestamp =
              Timex.set(zero_day,
                hour: start_time.hour,
                minute: start_time.minute,
                second: start_time.second,
                microsecond: start_time.microsecond
              )
              |> Timex.to_unix()
              |> Kernel.*(1000)

            zeroed_end =
              Timex.set(zero_day,
                hour: end_time.hour,
                minute: end_time.minute,
                second: end_time.second,
                microsecond: end_time.microsecond
              )

            zeroed_end_timestamp = Timex.to_unix(zeroed_end) * 1000

            start_timestamp = start_of_today + zeroed_start_timestamp
            end_timestamp = start_of_today + zeroed_end_timestamp

            if zeroed_start_timestamp > zeroed_end_timestamp do
              timestamp >= start_timestamp || timestamp <= end_timestamp
            else
              timestamp >= start_timestamp && timestamp <= end_timestamp
            end

          _ ->
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
        "name" => "foo",
        "featureId" => "bar",
        "seed" => 0,
        "value" => 0,
        "schedule" => %{
          "start" => Timex.to_unix(Timex.subtract(now, Duration.from_days(2))) * 1000,
          "end" => Timex.to_unix(Timex.add(now, Duration.from_days(2))) * 1000,
          "timeType" => TimeType.start_end(),
          "startTime" => Timex.to_unix(Timex.subtract(now, Duration.from_hours(2))) * 1000,
          "endTime" => Timex.to_unix(Timex.add(now, Duration.from_hours(2))) * 1000
        },
        "featureType" => FeatureType.toggle(),
        "scheduleType" => ScheduleType.global()
      }
    end
  end
end
