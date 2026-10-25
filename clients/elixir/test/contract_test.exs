defmodule SharedContractTest do
  use ExUnit.Case

  if System.get_env("VEXILLA_CONTRACT_DIR") in [nil, ""] and
       not File.exists?(Path.expand("../../../.contract-artifacts/metadata.json", __DIR__)) do
    @moduletag skip: "Use contract/scripts/run.cjs to supply immutable shared artifacts"
  end

  defp root,
    do:
      System.get_env("VEXILLA_CONTRACT_DIR") ||
        Path.expand("../../../.contract-artifacts", __DIR__)

  defp read(name), do: root() |> Path.join(name) |> File.read!() |> Jason.decode!()
  defp fetch(url), do: read(Path.basename(url))

  defp config(env \\ "prod", id \\ "member"),
    do: VexillaClient.create_config("https://contract", env, id)

  defp value(v), do: %{"value" => v}

  defp outcome(fn_body) do
    try do
      value(fn_body.())
    rescue
      e in VexillaContractError -> %{"error" => e.kind}
      _e in Jason.DecodeError -> %{"error" => "validation"}
    end
  end

  defp tokens(pointer),
    do:
      pointer
      |> String.slice(1..-1)
      |> String.split("/")
      |> Enum.map(&(String.replace(&1, "~1", "/") |> String.replace("~0", "~")))

  defp at(value, []), do: value

  defp at(value, [key | rest]) when is_list(value),
    do: at(Enum.at(value, String.to_integer(key)), rest)

  defp at(value, [key | rest]), do: at(Map.fetch!(value, key), rest)

  defp update(value, [key], item, remove) when is_list(value) do
    index = String.to_integer(key)

    cond do
      remove -> List.delete_at(value, index)
      index == length(value) -> value ++ [item]
      true -> List.replace_at(value, index, item)
    end
  end

  defp update(value, [key], item, remove),
    do: if(remove, do: Map.delete(value, key), else: Map.put(value, key, item))

  defp update(value, [key | rest], item, remove) when is_list(value) do
    index = String.to_integer(key)
    List.replace_at(value, index, update(Enum.at(value, index), rest, item, remove))
  end

  defp update(value, [key | rest], item, remove),
    do: Map.put(value, key, update(Map.fetch!(value, key), rest, item, remove))

  defp mutate(value, mutations) do
    Enum.reduce(mutations, value, fn m, v ->
      item =
        cond do
          m["op"] == "remove" -> nil
          m["op"] == "copy" -> at(v, tokens(m["from"]))
          Map.has_key?(m, "wireString") -> Jason.decode!(m["wireString"])
          Map.has_key?(m, "nativeNumber") -> :unrepresentable_nonfinite
          true -> m["value"]
        end

      update(v, tokens(m["path"]), item, m["op"] == "remove")
    end)
  end

  defp equal(a, b) when is_number(a) and is_number(b), do: a == b

  defp equal(a, b) when is_map(a) and is_map(b),
    do:
      MapSet.new(Map.keys(a)) == MapSet.new(Map.keys(b)) and
        Enum.all?(a, fn {k, v} -> equal(v, b[k]) end)

  defp equal(a, b) when is_list(a) and is_list(b),
    do: length(a) == length(b) and Enum.zip(a, b) |> Enum.all?(fn {x, y} -> equal(x, y) end)

  defp equal(a, b), do: a === b

  defp observation(id, got, want) do
    assert equal(got, want), "#{id}\nExpected #{inspect(want)}\nActual #{inspect(got)}"
    %{"caseId" => id, "outcome" => got}
  end

  defp sample(s, got), do: observation(s["id"], got, s["expected"])

  test "complete production-path contract" do
    expected = read("expected.json")
    parity = read("parity.json")
    hashes = Enum.map(parity["hashes"], &sample(&1, value(Hasher.hash_fnv32a(&1["text"]))))

    numbers =
      Enum.map(parity["numbers"], fn s ->
        text = Hasher.instance_text(s["instance"])
        sample(s, value(%{"text" => text, "hash" => Hasher.hash_fnv32a(text)}))
      end)

    gradual =
      Enum.map(parity["gradual"], fn s ->
        g =
          read("contract-group.json")
          |> put_in(["environments", "prod", "features", "gradual", "seed"], s["seed"])
          |> put_in(["environments", "prod", "features", "gradual", "value"], s["threshold"])

        c = config() |> VexillaClient.sync_manifest!(&fetch/1) |> VexillaClient.set_flags(g)

        sample(
          s,
          value(%{
            "bucket" => Hasher.hash_string(Hasher.instance_text(s["instance"]), s["seed"]),
            "enabled" =>
              VexillaClient.should_custom!(c, expected["groupId"], "gradual", s["instance"])
          })
        )
      end)

    schedules =
      Enum.map(
        parity["schedules"],
        &sample(
          &1,
          value(
            Scheduler.is_schedule_active_millis(&1["schedule"], &1["scheduleType"], &1["now"])
          )
        )
      )

    validation =
      Enum.map(parity["validation"], fn s ->
        results =
          for fetched <- [false, true] do
            outcome(fn ->
              source =
                mutate(
                  %{
                    "manifest" => read("manifest.json"),
                    "groups" => %{expected["groupId"] => read("contract-group.json")}
                  },
                  s["mutations"]
                )

              c =
                if fetched,
                  do: VexillaClient.sync_manifest!(config(), fn _ -> source["manifest"] end),
                  else: VexillaClient.set_manifest(config(), source["manifest"])

              Enum.reduce(source["groups"], c, fn {id, g}, c ->
                if fetched,
                  do: VexillaClient.sync_flags!(c, id, fn _ -> g end),
                  else: VexillaClient.set_flags(c, g)
              end)

              true
            end)
          end

        assert hd(results) == List.last(results)
        sample(s, hd(results))
      end)

    operations =
      Enum.map(parity["operations"], fn s ->
        {_, _, results} =
          Enum.reduce(s["steps"], {%{}, %{}, []}, fn step, {clients, data, results} ->
            result =
              try do
                {cs, ds, v} = step(step, clients, data)
                {:ok, cs, ds, value(v)}
              rescue
                e in VexillaContractError -> {:ok, clients, data, %{"error" => e.kind}}
                _e in Jason.DecodeError -> {:ok, clients, data, %{"error" => "validation"}}
              end

            {:ok, cs, ds, v} = result
            {cs, ds, results ++ [v]}
          end)

        sample(s, value(results))
      end)

    aliases =
      Enum.map(parity["aliases"], &sample(&1, value(VexillaCompatibility.normalize(&1["name"]))))

    zones =
      Enum.map(parity["timezones"], fn s ->
        g =
          put_in(
            read("contract-group.json"),
            ["features", "toggle", "schedule", "timezone"],
            s["timezone"]
          )

        result =
          outcome(fn ->
            config() |> VexillaClient.sync_manifest!(&fetch/1) |> VexillaClient.set_flags(g)
            true
          end)

        sample(s, value(Map.has_key?(result, "value")))
      end)

    publication =
      for env <- expected["environments"], lookup <- ["id", "name", "alias"] do
        name = fn id, label ->
          case lookup do
            "id" -> id
            "name" -> label
            "alias" -> VexillaCompatibility.normalize(label)
          end
        end

        c =
          config(name.(env["id"], env["name"]))
          |> VexillaClient.sync_manifest!(&fetch/1)
          |> VexillaClient.sync_flags!(expected["groupId"], &fetch/1)

        group = name.(expected["groupId"], expected["groupName"])

        values =
          expected["cases"]
          |> Enum.with_index()
          |> Enum.map(fn {s, index} ->
            result =
              outcome(fn ->
                if s["kind"] == "value",
                  do: VexillaClient.value!(c, group, name.(s["id"], s["name"]), "fallback"),
                  else:
                    VexillaClient.should_custom!(
                      c,
                      group,
                      name.(s["id"], s["name"]),
                      s["instance"]
                    )
              end)

            observation(
              "publication/#{env["id"]}/#{lookup}/#{index}",
              result,
              value(env[s["expectedKey"]])
            )
          end)

        g = read("contract-group.json")

        windows =
          Enum.map(expected["scheduled"] ++ ["scheduled-active"], fn id ->
            f = g["environments"][env["id"]]["features"][id]

            observation(
              "publication/#{env["id"]}/#{lookup}/schedule/#{id}",
              value(
                Scheduler.is_schedule_active_millis(
                  f["schedule"],
                  f["scheduleType"],
                  expected["referenceClock"]
                )
              ),
              value(id == "scheduled-active")
            )
          end)

        values ++ windows
      end

    observations =
      hashes ++
        numbers ++
        gradual ++
        schedules ++ validation ++ operations ++ aliases ++ zones ++ List.flatten(publication)

    assert length(observations) == MapSet.size(MapSet.new(Enum.map(observations, & &1["caseId"])))

    if path = System.get_env("VEXILLA_OBSERVATIONS_FILE"),
      do:
        File.write!(
          path,
          Jason.encode!(%{
            protocol: 1,
            sdk: "elixir",
            runs: [%{runtime: "native", observations: observations}]
          })
        )
  end

  defp step(s, clients, data) do
    c = clients[s["client"]]

    callback = fn _ ->
      if s["callback"]["throws"], do: raise("Transport failure")
      if file = s["callback"]["file"], do: read(file), else: data[s["callback"]["data"]]
    end

    case s["op"] do
      "load" ->
        {clients, Map.put(data, s["as"], read(s["file"])), nil}

      "new" ->
        {Map.put(clients, s["client"], config(s["environment"], s["instance"])), data, nil}

      "mutate" ->
        {clients, Map.update!(data, s["data"], &mutate(&1, s["mutations"])), nil}

      "setManifest" ->
        {Map.put(clients, s["client"], VexillaClient.set_manifest(c, data[s["data"]])), data, nil}

      "setFlags" ->
        {Map.put(clients, s["client"], VexillaClient.set_flags(c, data[s["data"]])), data, nil}

      "getManifest" ->
        {clients, Map.put(data, s["as"], VexillaClient.get_manifest!(c, callback)), nil}

      "getFlags" ->
        {clients, Map.put(data, s["as"], VexillaClient.get_flags!(c, s["group"], callback)), nil}

      "syncManifest" ->
        {Map.put(clients, s["client"], VexillaClient.sync_manifest!(c, callback)), data, nil}

      "syncFlags" ->
        {Map.put(clients, s["client"], VexillaClient.sync_flags!(c, s["group"], callback)), data,
         nil}

      "should" ->
        {clients, data,
         if(Map.has_key?(s, "instance"),
           do: VexillaClient.should_custom!(c, s["group"], s["feature"], s["instance"]),
           else: VexillaClient.should!(c, s["group"], s["feature"])
         )}

      "value" ->
        {clients, data, VexillaClient.value!(c, s["group"], s["feature"], s["default"])}
    end
  end

  test "raw Unicode and native IDs are rejected without replacement" do
    c =
      config()
      |> VexillaClient.sync_manifest!(&fetch/1)
      |> VexillaClient.sync_flags!("contract-group", &fetch/1)

    for id <- [nil, true, 9_007_199_254_740_993, <<0xFF>>, <<0xED, 0xA0, 0x80>>] do
      assert_raise VexillaContractError, fn ->
        VexillaClient.should_custom!(c, "contract-group", "gradual", id)
      end
    end

    for wire <- ["\\ud800", "\\udfff", "\\ud800x"] do
      assert_raise VexillaContractError, fn ->
        VexillaClient.get_manifest!(c, fn _ ->
          "{\"version\":\"v1\",\"groups\":[],\"extra\":\"#{wire}\"}"
        end)
      end
    end
  end
end
