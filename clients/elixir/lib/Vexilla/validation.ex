defmodule VexillaValidation do
  def check(ok, message),
    do: if(ok, do: :ok, else: raise(VexillaContractError, kind: "validation", message: message))

  def obj(v) do
    check(is_map(v) and not is_struct(v), "Expected a JSON object")
    v
  end

  def text(v, nonempty \\ false) do
    check(is_binary(v) and (not nonempty or v != ""), "Expected a string")
    v
  end

  def number(v, integer \\ false) do
    check(
      is_number(v) and (not integer or (abs(v) <= 9_007_199_254_740_991 and trunc(v) == v)),
      "Expected a finite number in integer bounds"
    )

    v
  end

  def tree(v) when is_binary(v), do: check(String.valid?(v), "Malformed Unicode string")

  def tree(v) when is_map(v),
    do:
      Enum.each(v, fn {k, item} ->
        check(is_binary(k) and String.valid?(k), "Malformed Unicode key")
        tree(item)
      end)

  def tree(v) when is_list(v), do: Enum.each(v, &tree/1)
  def tree(_), do: :ok
  defp member(v, allowed), do: check(v in allowed, "Unsupported enum")

  defp safe_id(v) do
    id = text(v, true)

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

  def schedule(v) do
    tree(v)
    s = obj(v)
    Enum.each(["start", "end", "startTime", "endTime"], &number(s[&1], true))
    member(s["timeType"], ["none", "start/end", "daily"])
    check(VexillaCompatibility.timezone(text(s["timezone"], true)), "Invalid timezone")
    v
  end

  def feature(v) do
    tree(v)
    f = obj(v)
    text(f["name"])
    text(f["featureId"], true)
    member(f["scheduleType"], ["", "global", "environment"])
    schedule(f["schedule"])

    case f["featureType"] do
      "toggle" ->
        check(is_boolean(f["value"]), "Toggle must be boolean")

      "gradual" ->
        number(f["value"])
        seed = number(f["seed"])
        check(seed > 0 and seed <= 1, "seed must satisfy 0 < seed <= 1")

      kind when kind in ["selective", "value"] ->
        member(f["valueType"], ["string", "number"])
        numeric = f["valueType"] == "number"
        if numeric, do: member(f["numberType"], ["int", "float"])
        item = fn v -> if numeric, do: number(v, f["numberType"] == "int"), else: text(v) end

        if kind == "selective" do
          check(is_list(f["value"]), "Selective must be array")
          Enum.each(f["value"], item)
        else
          item.(f["value"])
        end

      _ ->
        check(false, "Unsupported featureType")
    end

    v
  end

  defp features(v) do
    fields = obj(v)

    Enum.reduce(fields, %{}, fn {id, f}, aliases ->
      feature(f)
      check(f["featureId"] === id, "Feature map ID mismatch")
      alias(aliases, id, f["name"])
    end)

    fields
  end

  def manifest(v) do
    tree(v)
    m = obj(v)
    check(m["version"] == "v1", "Manifest version must be v1")
    check(is_list(m["groups"]), "Groups must be array")

    Enum.reduce(m["groups"], {MapSet.new(), %{}}, fn raw, {ids, aliases} ->
      g = obj(raw)
      id = safe_id(g["groupId"])
      check(not MapSet.member?(ids, id), "Duplicate group ID")
      {MapSet.put(ids, id), alias(aliases, id, text(g["name"]))}
    end)

    v
  end

  defp same(a, b, key) do
    if Map.has_key?(a, key) != Map.has_key?(b, key), do: false, else: same_value(a[key], b[key])
  end

  defp same_value(a, b) when is_number(a) and is_number(b), do: a == b
  defp same_value(a, b) when is_map(a) or is_list(a) or is_map(b) or is_list(b), do: false
  defp same_value(a, b), do: a === b

  def group(v) do
    tree(v)
    g = obj(v)
    safe_id(g["groupId"])
    text(g["name"])
    check(obj(g["meta"])["version"] == "v1", "Group version must be v1")
    defaults = features(g["features"])

    Enum.reduce(obj(g["environments"]), %{}, fn {id, raw}, aliases ->
      env = obj(raw)
      check(text(env["environmentId"], true) === id, "Environment map ID mismatch")
      aliases = alias(aliases, id, text(env["name"]))
      values = features(env["features"])

      check(
        MapSet.new(Map.keys(values)) == MapSet.new(Map.keys(defaults)),
        "Incomplete environment features"
      )

      Enum.each(values, fn {fid, f} ->
        Enum.each(
          ["name", "featureType", "valueType", "numberType"],
          &check(same(f, defaults[fid], &1), "Environment feature identity/subtype mismatch")
        )
      end)

      aliases
    end)

    v
  end

  def decode(v) when is_binary(v) do
    case Jason.decode(v) do
      {:ok, data} ->
        data

      {:error, error} ->
        raise VexillaContractError, kind: "validation", message: Exception.message(error)
    end
  end

  def decode(v), do: v
end
