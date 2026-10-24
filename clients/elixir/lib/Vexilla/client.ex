defmodule VexillaClient do
  @moduledoc "An immutable client configuration with validated publication snapshots."
  def create_config(base_url, environment, instance_id)
      when is_binary(base_url) and is_binary(environment) do
    %{
      base_url: String.trim_trailing(base_url, "/"),
      environment: environment,
      instance_id: instance_id,
      manifest: nil,
      groups: %{},
      group_lookup_table: %{},
      environment_lookup_table: %{},
      feature_lookup_table: %{}
    }
  end

  defp request(config, path, callback) do
    try do
      callback.(config.base_url <> "/" <> path)
    rescue
      error -> raise VexillaContractError, kind: "fetch", message: Exception.message(error)
    end
  end

  def get_manifest!(config, http_callback),
    do:
      config
      |> request("manifest.json", http_callback)
      |> VexillaValidation.decode()
      |> VexillaValidation.manifest()

  def set_manifest(config, manifest) do
    VexillaValidation.manifest(manifest)

    aliases =
      Enum.reduce(manifest["groups"], %{}, fn g, acc ->
        VexillaValidation.alias(acc, g["groupId"], g["name"])
      end)

    groups =
      Map.filter(config.groups, fn {id, g} ->
        Enum.any?(manifest["groups"], &(&1["groupId"] == id and &1["name"] == g["name"]))
      end)

    %{
      config
      | manifest: manifest,
        group_lookup_table: aliases,
        groups: groups,
        environment_lookup_table: Map.take(config.environment_lookup_table, Map.keys(groups)),
        feature_lookup_table: Map.take(config.feature_lookup_table, Map.keys(groups))
    }
  end

  def sync_manifest!(config, http_callback),
    do: set_manifest(config, get_manifest!(config, http_callback))

  defp lookup(map, key) do
    case Map.fetch(map, key) do
      {:ok, v} ->
        v

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
    id = lookup(config.group_lookup_table, group_name_or_id)

    group =
      config
      |> request(id <> ".json", http_callback)
      |> VexillaValidation.decode()
      |> VexillaValidation.group()

    match(config, group)
    VexillaValidation.check(group["groupId"] == id, "Fetched group differs from requested group")
    group
  end

  def set_flags(config, group) do
    VexillaValidation.group(group)
    match(config, group)

    envs =
      Enum.reduce(group["environments"], %{}, fn {id, e}, acc ->
        VexillaValidation.alias(acc, id, e["name"])
      end)

    features =
      Enum.reduce(group["features"], %{}, fn {id, f}, acc ->
        VexillaValidation.alias(acc, id, f["name"])
      end)

    id = group["groupId"]

    %{
      config
      | groups: Map.put(config.groups, id, group),
        environment_lookup_table: Map.put(config.environment_lookup_table, id, envs),
        feature_lookup_table: Map.put(config.feature_lookup_table, id, features)
    }
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
    f = feature(config, group_name_or_id, feature_name_or_id)

    if f["featureType"] == "value",
      do:
        raise(VexillaContractError,
          kind: "kind",
          message: "Value feature requires value operation"
        )

    if f["featureType"] != "toggle", do: Hasher.validate_instance(custom_instance_id)

    if Scheduler.is_scheduled_feature_active(f) do
      case f["featureType"] do
        "toggle" ->
          f["value"]

        "gradual" ->
          Hasher.hash_string(Hasher.instance_text(custom_instance_id), f["seed"]) < f["value"]

        "selective" ->
          Enum.any?(f["value"], fn v ->
            (is_binary(v) and is_binary(custom_instance_id) and v === custom_instance_id) or
              (is_number(v) and is_number(custom_instance_id) and v == custom_instance_id)
          end)
      end
    else
      false
    end
  end

  def value!(config, group_name_or_id, feature_name_or_id, default_value) do
    f = feature(config, group_name_or_id, feature_name_or_id)

    if f["featureType"] != "value",
      do: raise(VexillaContractError, kind: "kind", message: "Expected value feature")

    if Scheduler.is_scheduled_feature_active(f), do: f["value"], else: default_value
  end
end
