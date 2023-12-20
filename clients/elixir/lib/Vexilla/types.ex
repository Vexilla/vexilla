defmodule FeatureType do
  @toggle "toggle"
  @gradual "gradual"
  @selective "selective"
  @value "value"

  defmacro toggle, do: @toggle
  defmacro gradual, do: @gradual
  defmacro selective, do: @selective
  defmacro value, do: @value
end

defmodule ScheduleType do
  @empty ""
  @global "global"
  @environment "environment"

  defmacro empty, do: @empty
  defmacro global, do: @global
  defmacro environment, do: @environment
end

defmodule TimeType do
  @none "none"
  @start_end "start/end"
  @daily "daily"

  defmacro none, do: @none
  defmacro start_end, do: @start_end
  defmacro daily, do: @daily
end

defmodule ValueType do
  @string "string"
  @int "int"
  @float "float"

  defmacro string, do: @string
  defmacro int, do: @int
  defmacro float, do: @float
end

defmodule Schedule do
  use TypedStruct

  @derive Jason.Encoder
  typedstruct enforce: true do
    field :start, integer()
    field :end, integer()
    field :timezone, String.t(), default: "UTC"
    field :timeType, String.t()
    field :startTime, integer()
    field :endTime, integer()
  end
end

defmodule GroupMeta do
  use TypedStruct

  typedstruct enforce: true do
    field :version, String.t()
  end
end

defmodule Environment do
  use TypedStruct

  typedstruct enforce: true do
    field :name, String.t()
    field :environmentId, String.t()
    field :features, [Feature.t()]
  end
end

defmodule ManifestGroup do
  use TypedStruct

  typedstruct enforce: true do
    field :name, String.t()
    field :groupId, String.t()
  end
end

defmodule Manifest do
  use TypedStruct

  typedstruct enforce: true do
    field :version, String.t()
    field :groups, [ManifestGroup.t()]
  end
end

defmodule Group do
  use TypedStruct

  typedstruct enforce: true do
    field :name, String.t()
    field :groupId, String.t()
    field :meta, GroupMeta.t()
    field :environments, term()
    field :features, term()
  end
end

defmodule Feature do
  use TypedStruct

  typedstruct enforce: true do
    field :name, String.t()
    field :featureId, String.t()
    field :featureType, String.t()
    field :scheduleType, String.t()
    field :schedule, Schedule.t()

    field :value,
          boolean() | String.t() | integer() | float() | [String.t()] | [integer()] | [float()]

    field :seed, float() | nil
  end
end
