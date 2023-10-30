defmodule VexillaClient do
  @moduledoc """
  Documentation for `Client`.
  """
  require FeatureType

  @doc """
  Create a client with a base url and environment name
  """
  def create_config(base_url, environment, instance_id)
      when is_binary(base_url) and is_binary(environment) and is_binary(instance_id) do
    %{
      base_url: base_url,
      environment: environment,
      instance_id: instance_id,
      manifest: %{},
      group_lookup_table: %{},
      environment_lookup_table: %{},
      feature_lookup_table: %{},
      groups: %{}
    }
  end

  def get_manifest!(config, http_callback) when is_function(http_callback) do
    http_callback.("#{config.base_url}/manifest.json")
  end

  def set_manifest(config, manifest) do
    group_lookup_table =
      Enum.reduce(manifest["groups"], %{}, fn group, group_lookup_table ->
        group_lookup_table
        |> Map.put(group["groupId"], group["groupId"])
        |> Map.put(group["name"], group["groupId"])
      end)

    # %{config: config, manifest: manifest, group_lookup_table: group_lookup_table}
    config
    |> Map.put(:manifest, manifest)
    |> Map.put(:group_lookup_table, group_lookup_table)
  end

  def sync_manifest!(config, http_callback) when is_function(http_callback) do
    manifest = get_manifest!(config, http_callback)
    set_manifest(config, manifest)
  end

  def get_flags(config, group_name_or_id, http_callback) when is_function(http_callback) do
    group_id = config.group_lookup_table[group_name_or_id]
    http_callback.("#{config.base_url}/#{group_id}.json")
  end

  def set_flags(config, group) do
    group_environments =
      Enum.reduce(Map.values(group["environments"]), %{}, fn environment, group_environments ->
        group_environments
        |> Map.put(environment["environmentId"], environment["environmentId"])
        |> Map.put(environment["name"], environment["environmentId"])
      end)

    environment_lookup_table =
      Map.put_new(
        config.environment_lookup_table,
        group["groupId"],
        group_environments
      )

    group_features =
      Enum.reduce(Map.values(group["features"]), %{}, fn feature, group_features ->
        group_features
        |> Map.put(feature["featureId"], feature["featureId"])
        |> Map.put(feature["name"], feature["featureId"])
      end)

    feature_lookup_table =
      Map.put_new(config.feature_lookup_table, group["groupId"], group_features)

    config_groups = Map.put(config.groups, group["groupId"], group)

    config
    |> Map.put(:environment_lookup_table, environment_lookup_table)
    |> Map.put(:feature_lookup_table, feature_lookup_table)
    |> Map.put(:groups, config_groups)
  end

  def sync_flags!(config, group_name_or_id, http_callback) do
    group = get_flags(config, group_name_or_id, http_callback)
    set_flags(config, group)
  end

  def should?(config, group_name_or_id, feature_name_or_id) do
    should_custom?(config, group_name_or_id, feature_name_or_id, config.instance_id)
  end

  def should_custom?(config, group_name_or_id, feature_name_or_id, custom_instance_id) do
    group_id = config.group_lookup_table[group_name_or_id]
    group = config.groups[group_id]

    environment_id = config.environment_lookup_table[group_id][config.environment]
    environment = group["environments"][environment_id]

    feature_id = config.feature_lookup_table[group_id][feature_name_or_id]
    feature = environment["features"][feature_id]

    feature_type_toggle = FeatureType.toggle()
    feature_type_gradual = FeatureType.gradual()
    feature_type_selective = FeatureType.selective()
    feature_type_value = FeatureType.value()

    within_schedule = Scheduler.is_scheduled_feature_active(feature)

    case {feature["featureType"], within_schedule} do
      {_, false} ->
        false

      {^feature_type_toggle, _} ->
        feature.value

      {^feature_type_gradual, _} ->
        Hasher.hash_string(custom_instance_id, feature["seed"]) < feature["value"]

      {^feature_type_selective, _} ->
        Enum.find_index(feature["value"], fn value -> value == custom_instance_id end) != nil

      {^feature_type_value, _} ->
        false
    end
  end

  def value!(config, group_name_or_id, feature_name_or_id, default_value) do
    group_id = config.group_lookup_table[group_name_or_id]
    group = config.groups[group_id]

    environment_id = config.environment_lookup_table[group_id][config.environment]
    environment = group.environments[environment_id]

    feature_id = config.feature_lookup_table[group_id][feature_name_or_id]
    feature = environment.features[feature_id]

    if feature["featureType"] != FeatureType.value() do
      # Maybe throw error/panic
    end

    within_schedule = Scheduler.is_scheduled_feature_active(feature)

    case within_schedule do
      true -> feature["value"]
      false -> default_value
    end
  end
end
