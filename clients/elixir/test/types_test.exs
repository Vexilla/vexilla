defmodule TypesTest do
  require ScheduleType
  require FeatureType
  require TimeType
  use ExUnit.Case

  test "typed structs can be instantiated" do
    assert schedule = %Schedule{
      start: 0,
      end: 0,
      timezone: "UTC",
      timeType: TimeType.none(),
      startTime: 0,
      endTime: 0
    }

    assert group_meta = %GroupMeta{
      version: "1.0"
    }

    assert environment = %Environment{
      name: "FOO" ,
      environmentId: "BAR",
      features: []
    }

    assert manifest_group = %ManifestGroup{
      name: "FOO",
      groupId: "BAR"
    }

    assert manifest = %Manifest{
      version: "1.0",
      groups: []
    }

    assert feature = %Feature{
      name: "FOO",
      featureId: "BAR",
      featureType: FeatureType.toggle(),
      scheduleType: ScheduleType.empty(),
      schedule: schedule,
      value: true,
      seed: nil
    }

    assert group = %Group{
      name: "FOO",
      groupId: "BAR",
      meta: group_meta,
      environments: [environment],
      features: [feature]
    }
  end
end
