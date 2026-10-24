defmodule Scheduler do
  @moduledoc false

  use Timex
  require ScheduleType
  require TimeType
  require FeatureType

  @doc """
  Checks if a feature's schedule is active

  """
  def is_scheduled_feature_active(feature) do
    is_schedule_active(feature["schedule"], feature["scheduleType"])
  end

  def is_schedule_active(schedule, schedule_type, datetime \\ DateTime.utc_now()) do
    millis =
      case datetime do
        %DateTime{} ->
          DateTime.to_unix(datetime, :millisecond)

        %NaiveDateTime{} ->
          datetime |> DateTime.from_naive!("Etc/UTC") |> DateTime.to_unix(:millisecond)
      end

    is_schedule_active_millis(schedule, schedule_type, millis)
  end

  defp day(value), do: Integer.floor_div(trunc(value), 86_400_000) * 86_400_000

  def is_schedule_active_millis(s, mode, now) do
    cond do
      mode == "" ->
        true

      now < day(s["start"]) or now > day(s["end"]) + 86_400_000 - 1 ->
        false

      s["timeType"] == "none" ->
        true

      s["timeType"] == "start/end" ->
        now >= day(s["start"]) + s["startTime"] and now <= day(s["end"]) + s["endTime"]

      true ->
        clock = Integer.mod(now, 86_400_000)
        start = Integer.mod(trunc(s["startTime"]), 86_400_000)
        finish = Integer.mod(trunc(s["endTime"]), 86_400_000)

        if start <= finish,
          do: clock >= start and clock <= finish,
          else: clock >= start or clock <= finish
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
