defmodule VexillaClientTest do
  use ExUnit.Case
  # doctest VexillaClient

  test "fetches feature flags" do
    HTTPoison.start()

    user_id = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

    config =
      VexillaClient.create_config(
        "http://localhost:3000",
        "dev",
        user_id
      )
      |> VexillaClient.sync_manifest!(fn url ->
        manifest_response = HTTPoison.get!(url)
        Jason.decode!(manifest_response.body)
      end)
      |> VexillaClient.sync_flags!("Gradual", fn url ->
        manifest_response = HTTPoison.get!(url)
        Jason.decode!(manifest_response.body)
      end)

    should_gradual = VexillaClient.should?(config, "Gradual", "testingWorkingGradual")
    assert should_gradual == true

    should_not_gradual = VexillaClient.should?(config, "Gradual", "testingNonWorkingGradual")
    assert should_not_gradual == false

  end
end
