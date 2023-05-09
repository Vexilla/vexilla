defmodule VexillaClientHTTPoison do
  defdelegate create_config(base_url, environment), to: VexillaClient
  defdelegate should?(flags, flagName, instance_id), to: VexillaClient
  defdelegate should?(flags, flagName, instance_id, groupName), to: VexillaClient

  @doc """
  Fetch the flags and parse, returning the appropriate flags for the environment

  ## Examples

    iex> VexillaClient.get_flags(%{base_url: "https://streamparrot-feature-flags.s3.amazonaws.com",environment: "staging"}, "features")
    %{
      "untagged" => %{
        "billing" => %{
          "type" => "toggle",
          "value" => false
        }
      },
      "features" => %{
        "billing" => %{
          "type" => "toggle",
          "value" => false
        }
      }
    }

  """
  def get_flags(config, file_name) do
    HTTPoison.start()
    flags_response = HTTPoison.get!("#{config.base_url}/#{file_name}.json")

    flags_response_parsed = Jason.decode!(flags_response.body)

    flags_response_parsed["environments"][config.environment]
  end
end
