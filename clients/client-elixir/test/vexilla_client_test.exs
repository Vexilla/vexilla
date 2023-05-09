defmodule VexillaClientTest do
  use ExUnit.Case
  doctest VexillaClient

  test "fetches feature flags" do
    config =
      VexillaClient.create_config(
        "https://streamparrot-feature-flags.s3.amazonaws.com",
        "dev"
      )

    flags =
      VexillaClient.get_flags(config, "features", fn base_url, file_name ->
        HTTPoison.start()
        flags_response = HTTPoison.get!("#{base_url}/#{file_name}.json")
      end)

    should_use_feature =
      VexillaClient.should?(flags, "billing", "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a")

    assert should_use_feature == true

    should_use_working_gradual =
      VexillaClient.should?(
        flags,
        "testingWorkingGradual",
        "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
      )

    assert should_use_working_gradual == true

    should_use_non_working_gradual =
      VexillaClient.should?(
        flags,
        "testingNonWorkingGradual",
        "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
      )

    assert should_use_non_working_gradual == false
  end
end
