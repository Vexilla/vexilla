defmodule SharedContractTest do
  use ExUnit.Case
  if System.get_env("VEXILLA_CONTRACT_DIR") in [nil, ""] do
    @moduletag skip: "Run through contract/scripts/run.cjs with generated contract artifacts"
  end

  test "shared seed bounds" do
    root = System.fetch_env!("VEXILLA_CONTRACT_DIR")
    expected = root |> Path.join("expected.json") |> File.read!() |> Jason.decode!()
    group = root |> Path.join("contract-group.json") |> File.read!() |> Jason.decode!()
    config = VexillaClient.create_config("https://contract", "dev", "member")
      |> VexillaClient.sync_manifest!(fn _ -> root |> Path.join("manifest.json") |> File.read!() |> Jason.decode!() end)
    for sample <- expected["seedCases"] do
      input = put_in(group, ["environments", "dev", "features", "gradual", "seed"], sample["value"])
      if sample["valid"] do
        assert VexillaClient.get_flags!(config, "contract-group", fn _ -> input end) == input
      else
        assert_raise ArgumentError, ~r/seed/, fn -> VexillaClient.get_flags!(config, "contract-group", fn _ -> input end) end
      end
    end
  end
  test "production-generated shared contract" do
    root = System.fetch_env!("VEXILLA_CONTRACT_DIR")
    expected = root |> Path.join("expected.json") |> File.read!() |> Jason.decode!()
    fetch = fn url -> root |> Path.join(Path.basename(url)) |> File.read!() |> Jason.decode!() end
    for env <- expected["environments"], names <- [false, true] do
      group = expected[(if names do
        "groupName"
      else
        "groupId"
      end)]
      config = VexillaClient.create_config("https://contract", env[(if names do
        "name"
      else
        "id"
      end)], "member")
        |> VexillaClient.sync_manifest!(fetch)
      decoded = VexillaClient.get_flags!(config, group, fetch)
      assert decoded["environments"][env["id"]]["features"]["gradual"]["seed"] == env["seed"]
      assert decoded["environments"][env["id"]]["features"]["gradual"]["value"] == env["threshold"]
      for fid <- expected["scheduled"] ++ ["scheduled-active"] do
        f = decoded["environments"][env["id"]]["features"][fid]
        assert Scheduler.is_schedule_active(f["schedule"], f["scheduleType"], Timex.from_unix(expected["referenceClock"], :millisecond)) == (fid == "scheduled-active")
      end
      config = VexillaClient.set_flags(config, decoded)
      for c <- expected["cases"] do
        fid = c[(if names do
        "name"
      else
        "id"
      end)]
      result = if c["kind"] == "value" do
        VexillaClient.value!(config, group, fid, "fallback")
      else
        VexillaClient.should_custom!(config, group, fid, c["instance"])
      end
        assert result == env[c["expectedKey"]], "#{env["id"]}/#{fid}"
      end
      for fid <- expected["scheduled"] do
        assert(VexillaClient.should!(config, group, fid) == false)
      end
    end
  end
end
