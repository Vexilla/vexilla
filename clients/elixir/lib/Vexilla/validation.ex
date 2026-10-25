defmodule VexillaValidation do
  def check(ok, message),
    do: if(ok, do: :ok, else: raise(VexillaContractError, kind: "validation", message: message))

  def obj(value) do
    check(is_map(value) and not is_struct(value), "Expected a JSON object")
    value
  end

  def text(value, nonempty \\ false) do
    check(is_binary(value) and (not nonempty or value != ""), "Expected a string")
    value
  end

  def number(value, integer \\ false) do
    check(
      is_number(value) and
        (not integer or (abs(value) <= 9_007_199_254_740_991 and trunc(value) == value)),
      "Expected a finite number in integer bounds"
    )

    value
  end

  def tree(value) when is_binary(value),
    do: check(String.valid?(value), "Malformed Unicode string")

  def tree(value) when is_map(value),
    do:
      Enum.each(value, fn {k, item} ->
        check(is_binary(k) and String.valid?(k), "Malformed Unicode key")
        tree(item)
      end)

  def tree(value) when is_list(value), do: Enum.each(value, &tree/1)
  def tree(_), do: :ok
  defp member(value, allowed), do: check(value in allowed, "Unsupported enum")

  defp safe_id(value) do
    id = text(value, true)

    check(
      id not in ["manifest", "config", ".", ".."] and
        not String.contains?(id, ["/", "\\", <<0>>]),
      "Unsafe group ID"
    )

    id
  end

  def alias(aliases, id, name) do
    Enum.reduce([id, name, VexillaCompatibility.normalize(name)], aliases, fn key, acc ->
      check(not Map.has_key?(acc, key) or acc[key] == id, "Alias collision")
      Map.put(acc, key, id)
    end)
  end

  def schedule(value) do
    tree(value)
    schedule = obj(value)
    Enum.each(["start", "end", "startTime", "endTime"], &number(schedule[&1], true))
    member(schedule["timeType"], ["none", "start/end", "daily"])
    check(VexillaCompatibility.timezone(text(schedule["timezone"], true)), "Invalid timezone")
    value
  end

  def feature(value) do
    tree(value)
    feature = obj(value)
    text(feature["name"])
    text(feature["featureId"], true)
    member(feature["scheduleType"], ["", "global", "environment"])
    schedule(feature["schedule"])

    case feature["featureType"] do
      "toggle" ->
        check(is_boolean(feature["value"]), "Toggle must be boolean")

      "gradual" ->
        number(feature["value"])
        seed = number(feature["seed"])
        check(seed > 0 and seed <= 1, "seed must satisfy 0 < seed <= 1")

      kind when kind in ["selective", "value"] ->
        member(feature["valueType"], ["string", "number"])
        numeric = feature["valueType"] == "number"
        if numeric, do: member(feature["numberType"], ["int", "float"])

        item = fn value ->
          if numeric, do: number(value, feature["numberType"] == "int"), else: text(value)
        end

        if kind == "selective" do
          check(is_list(feature["value"]), "Selective must be array")
          Enum.each(feature["value"], item)
        else
          item.(feature["value"])
        end

      _ ->
        check(false, "Unsupported featureType")
    end

    value
  end

  defp features(value) do
    fields = obj(value)

    Enum.reduce(fields, %{}, fn {id, feature}, aliases ->
      feature(feature)
      check(feature["featureId"] === id, "Feature map ID mismatch")
      alias(aliases, id, feature["name"])
    end)

    fields
  end

  def manifest(value) do
    tree(value)
    manifest = obj(value)
    check(manifest["version"] == "v1", "Manifest version must be v1")
    check(is_list(manifest["groups"]), "Groups must be array")

    Enum.reduce(manifest["groups"], {MapSet.new(), %{}}, fn raw, {ids, aliases} ->
      group = obj(raw)
      id = safe_id(group["groupId"])
      check(not MapSet.member?(ids, id), "Duplicate group ID")
      {MapSet.put(ids, id), alias(aliases, id, text(group["name"]))}
    end)

    value
  end

  defp same(left, right, key) do
    if Map.has_key?(left, key) != Map.has_key?(right, key),
      do: false,
      else: same_value(left[key], right[key])
  end

  defp same_value(left, right) when is_number(left) and is_number(right), do: left == right

  defp same_value(left, right)
       when is_map(left) or is_list(left) or is_map(right) or is_list(right),
       do: false

  defp same_value(left, right), do: left === right

  def group(value) do
    tree(value)
    group = obj(value)
    safe_id(group["groupId"])
    text(group["name"])
    check(obj(group["meta"])["version"] == "v1", "Group version must be v1")
    defaults = features(group["features"])

    Enum.reduce(obj(group["environments"]), %{}, fn {id, raw}, aliases ->
      environment = obj(raw)
      check(text(environment["environmentId"], true) === id, "Environment map ID mismatch")
      aliases = alias(aliases, id, text(environment["name"]))
      values = features(environment["features"])

      check(
        MapSet.new(Map.keys(values)) == MapSet.new(Map.keys(defaults)),
        "Incomplete environment features"
      )

      Enum.each(values, fn {feature_id, feature} ->
        Enum.each(
          ["name", "featureType", "valueType", "numberType"],
          &check(
            same(feature, defaults[feature_id], &1),
            "Environment feature identity/subtype mismatch"
          )
        )
      end)

      aliases
    end)

    value
  end

  def decode(value) when is_binary(value) do
    case Jason.decode(value) do
      {:ok, data} ->
        data

      {:error, error} ->
        raise VexillaContractError, kind: "validation", message: Exception.message(error)
    end
  end

  def decode(value), do: value
end
