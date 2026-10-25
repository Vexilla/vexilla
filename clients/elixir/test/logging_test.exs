defmodule LoggingTest do
  use ExUnit.Case
  import ExUnit.CaptureLog

  test "diagnostics are opt-in and preserve failures" do
    for show_logs <- [false, true] do
      diagnostics =
        capture_log([level: :info], fn ->
          config =
            VexillaClient.create_config(
              "https://private-token@contract",
              "prod",
              "private-instance",
              show_logs
            )

          manifest =
            VexillaClient.get_manifest!(config, fn _ -> %{"version" => "v1", "groups" => []} end)

          config = VexillaClient.set_manifest(config, manifest)

          assert_raise VexillaContractError, fn ->
            VexillaClient.get_manifest!(config, fn _ -> raise "private-callback-error" end)
          end

          assert_raise VexillaContractError, fn ->
            VexillaClient.set_manifest(config, %{manifest | "version" => "invalid"})
          end
        end)

      if show_logs do
        for expected <- [
              "manifest.fetch outcome=success",
              "manifest.install outcome=success",
              "manifest.fetch outcome=failure",
              "manifest.install outcome=failure"
            ] do
          assert diagnostics =~ expected
        end

        refute diagnostics =~ "private-"
      else
        assert diagnostics == ""
      end
    end
  end
end
