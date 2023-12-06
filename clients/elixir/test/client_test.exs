defmodule VexillaClientTest do
  use ExUnit.Case
  # doctest VexillaClient

  test "fetches feature flags" do
    HTTPoison.start()

    user_id = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

    test_server_host = System.get_env("TEST_SERVER_HOST", "localhost:3000")

    config =
      VexillaClient.create_config(
        "http://#{test_server_host}",
        "dev",
        user_id
      )
      |> VexillaClient.sync_manifest!(&generic_fetch!/1)
      |> VexillaClient.sync_flags!("Gradual", &generic_fetch!/1)

    should_gradual = VexillaClient.should?(config, "Gradual", "testingWorkingGradual")
    assert should_gradual == true

    should_not_gradual = VexillaClient.should?(config, "Gradual", "testingNonWorkingGradual")
    assert should_not_gradual == false

    config = VexillaClient.sync_flags!(config, "Selective", &generic_fetch!/1)

    should_selective_string = VexillaClient.should?(config, "Selective", "String")
    assert should_selective_string == true

    should_selective_custom_string =
      VexillaClient.should_custom?(config, "Selective", "String", "shouldBeInList")

    assert should_selective_custom_string == true

    should_selective_number = VexillaClient.should_custom?(config, "Selective", "Number", 42)
    assert should_selective_number == true

    config = VexillaClient.sync_flags!(config, "Value", &generic_fetch!/1)

    value_string = VexillaClient.value!(config, "Value", "String", "bar")
    assert value_string == "foo"

    value_string_bad = VexillaClient.value!(config, "Value", "String_Bad", "bar")
    assert value_string_bad == "bar"

    value_int = VexillaClient.value!(config, "Value", "Integer", 0)
    assert value_int == 42

    value_int_bad = VexillaClient.value!(config, "Value", "Integer_Bad", 0)
    assert value_int_bad == 0

    value_float = VexillaClient.value!(config, "Value", "Float", 0)
    assert value_float == 42.42

    value_float_bad = VexillaClient.value!(config, "Value", "Float_Bad", 0)
    assert value_float_bad == 0

    config = VexillaClient.sync_flags!(config, "Scheduled", &generic_fetch!/1)

    should_before_global = VexillaClient.should?(config, "Scheduled", "beforeGlobal")
    assert should_before_global == false
    should_during_global = VexillaClient.should?(config, "Scheduled", "duringGlobal")
    assert should_during_global == true
    should_after_global = VexillaClient.should?(config, "Scheduled", "afterGlobal")
    assert should_after_global == false

    should_before_global_start_end =
      VexillaClient.should?(config, "Scheduled", "beforeGlobalStartEnd")

    assert should_before_global_start_end == false

    should_during_global_start_end =
      VexillaClient.should?(config, "Scheduled", "duringGlobalStartEnd")

    assert should_during_global_start_end == true

    should_after_global_start_end =
      VexillaClient.should?(config, "Scheduled", "afterGlobalStartEnd")

    assert should_after_global_start_end == false

    should_before_global_daily = VexillaClient.should?(config, "Scheduled", "beforeGlobalDaily")
    assert should_before_global_daily == false
    should_during_global_daily = VexillaClient.should?(config, "Scheduled", "duringGlobalDaily")
    assert should_during_global_daily == true
    should_after_global_daily = VexillaClient.should?(config, "Scheduled", "afterGlobalDaily")
    assert should_after_global_daily == false
  end

  # Fetch the JSON and decode it.
  defp generic_fetch!(url) do
    response = HTTPoison.get!(url)
    Jason.decode!(response.body)
  end
end
