defmodule VexillaClient do
  @moduledoc "An immutable client configuration with validated publication snapshots."
  require Logger

  def create_config(base_url, environment, instance_id, show_logs \\ false)
      when is_binary(base_url) and is_binary(environment) do
    %{
      base_url: String.trim_trailing(base_url, "/"),
      environment: environment,
      instance_id: instance_id,
      show_logs: show_logs,
      manifest: nil,
      groups: %{},
      group_lookup_table: %{},
      environment_lookup_table: %{},
      feature_lookup_table: %{}
    }
  end

  defp report_operation(config, operation_name, outcome) do
    if Map.get(config, :show_logs, false) do
      diagnostic = "vexilla operation=#{operation_name} outcome=#{outcome}"
      if outcome == "success", do: Logger.info(diagnostic), else: Logger.warning(diagnostic)
    end
  end

  defp diagnose_operation(config, operation_name, operation) do
    try do
      result = operation.()
      report_operation(config, operation_name, "success")
      result
    rescue
      error ->
        report_operation(config, operation_name, "failure")
        reraise error, __STACKTRACE__
    end
  end

  defp request(config, path, callback) do
    try do
      callback.(config.base_url <> "/" <> path)
    rescue
      error -> raise VexillaContractError, kind: "fetch", message: Exception.message(error)
    end
  end

  def get_manifest!(config, http_callback) do
    diagnose_operation(config, "manifest.fetch", fn ->
      config
      |> request("manifest.json", http_callback)
      |> VexillaValidation.decode()
      |> VexillaValidation.manifest()
    end)
  end

  def set_manifest(config, manifest) do
    diagnose_operation(config, "manifest.install", fn ->
      VexillaValidation.manifest(manifest)

      aliases =
        Enum.reduce(manifest["groups"], %{}, fn manifest_group, aliases ->
          VexillaValidation.alias(aliases, manifest_group["groupId"], manifest_group["name"])
        end)

      groups =
        Map.filter(config.groups, fn {group_id, installed_group} ->
          Enum.any?(
            manifest["groups"],
            &(&1["groupId"] == group_id and &1["name"] == installed_group["name"])
          )
        end)

      %{
        config
        | manifest: manifest,
          group_lookup_table: aliases,
          groups: groups,
          environment_lookup_table: Map.take(config.environment_lookup_table, Map.keys(groups)),
          feature_lookup_table: Map.take(config.feature_lookup_table, Map.keys(groups))
      }
    end)
  end

  def sync_manifest!(config, http_callback),
    do: set_manifest(config, get_manifest!(config, http_callback))

  defp lookup(map, key) do
    case Map.fetch(map, key) do
      {:ok, value} ->
        value

      :error ->
        raise VexillaContractError, kind: "lookup", message: "Lookup not found: #{inspect(key)}"
    end
  end

  defp match(config, group) do
    if config.manifest == nil,
      do: raise(VexillaContractError, kind: "lookup", message: "Manifest not installed")

    VexillaValidation.check(
      Enum.any?(
        config.manifest["groups"],
        &(&1["groupId"] == group["groupId"] and &1["name"] == group["name"])
      ),
      "Group differs from manifest ID/name"
    )
  end

  def get_flags!(config, group_name_or_id, http_callback) do
    diagnose_operation(config, "group.fetch", fn ->
      id = lookup(config.group_lookup_table, group_name_or_id)

      group =
        config
        |> request(id <> ".json", http_callback)
        |> VexillaValidation.decode()
        |> VexillaValidation.group()

      match(config, group)

      VexillaValidation.check(
        group["groupId"] == id,
        "Fetched group differs from requested group"
      )

      group
    end)
  end

  def set_flags(config, group) do
    diagnose_operation(config, "group.install", fn ->
      VexillaValidation.group(group)
      match(config, group)

      environment_aliases =
        Enum.reduce(group["environments"], %{}, fn {environment_id, environment}, aliases ->
          VexillaValidation.alias(aliases, environment_id, environment["name"])
        end)

      features =
        Enum.reduce(group["features"], %{}, fn {feature_id, feature}, aliases ->
          VexillaValidation.alias(aliases, feature_id, feature["name"])
        end)

      id = group["groupId"]

      %{
        config
        | groups: Map.put(config.groups, id, group),
          environment_lookup_table:
            Map.put(config.environment_lookup_table, id, environment_aliases),
          feature_lookup_table: Map.put(config.feature_lookup_table, id, features)
      }
    end)
  end

  def sync_flags!(config, group_name_or_id, http_callback),
    do: set_flags(config, get_flags!(config, group_name_or_id, http_callback))

  defp feature(config, group_name, feature_name) do
    id = lookup(config.group_lookup_table, group_name)
    group = lookup(config.groups, id)
    env = config.environment_lookup_table |> lookup(id) |> lookup(config.environment)
    fid = config.feature_lookup_table |> lookup(id) |> lookup(feature_name)
    group["environments"][env]["features"][fid]
  end

  def should!(config, group_name_or_id, feature_name_or_id),
    do: should_custom!(config, group_name_or_id, feature_name_or_id, config.instance_id)

  def should_custom!(config, group_name_or_id, feature_name_or_id, custom_instance_id) do
    feature = feature(config, group_name_or_id, feature_name_or_id)

    if feature["featureType"] == "value",
      do:
        raise(VexillaContractError,
          kind: "kind",
          message: "Value feature requires value operation"
        )

    if feature["featureType"] != "toggle", do: Hasher.validate_instance(custom_instance_id)

    if Scheduler.is_scheduled_feature_active(feature) do
      case feature["featureType"] do
        "toggle" ->
          feature["value"]

        "gradual" ->
          Hasher.hash_string(Hasher.instance_text(custom_instance_id), feature["seed"]) <
            feature["value"]

        "selective" ->
          Enum.any?(feature["value"], fn v ->
            (is_binary(v) and is_binary(custom_instance_id) and v === custom_instance_id) or
              (is_number(v) and is_number(custom_instance_id) and v == custom_instance_id)
          end)
      end
    else
      false
    end
  end

  def value!(config, group_name_or_id, feature_name_or_id, default_value) do
    feature = feature(config, group_name_or_id, feature_name_or_id)

    if feature["featureType"] != "value",
      do: raise(VexillaContractError, kind: "kind", message: "Expected value feature")

    if Scheduler.is_scheduled_feature_active(feature), do: feature["value"], else: default_value
  end
end
