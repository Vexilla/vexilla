defmodule VexillaClient do
  @moduledoc """
  Documentation for `VexillaClient`.
  """

  @doc """
  Create a client with a base url and environment name

  ## Examples

    iex> VexillaClient.create_config("https://somewhere-on-the-internet", "staging")
    %{
      base_url: "https://somewhere-on-the-internet",
      environment: "staging"
    }

  """
  def create_config(base_url, environment)
      when is_binary(base_url) and is_binary(environment) do
    %{
      base_url: base_url,
      environment: environment
    }
  end

  @doc """
  Fetch the flags and parse, returning the appropriate flags for the environment

  ## Examples

    iex> VexillaClient.get_flags(%{base_url: "https://streamparrot-feature-flags.s3.amazonaws.com",environment: "staging"}, "features", fn base_url, file_name ->
        HTTPoison.start()
        flags_response = HTTPoison.get!("\#{base_url}/\#{file_name}.json")
    end)
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
  def get_flags(config, fileName, httpCallback) when is_function(httpCallback) do
    flags_response = httpCallback.(config.base_url, fileName)

    flags_response_parsed = Jason.decode!(flags_response.body)

    flags_response_parsed["environments"][config.environment]
  end

  # original:
  # def get_flags(config, fileName) do
  #   HTTPoison.start()
  #   flags_response = HTTPoison.get!("#{config.base_url}/#{fileName}.json")

  #   flags_response_parsed = Jason.decode!(flags_response.body)

  #   flags_response_parsed["environments"][config.environment]
  # end

  @doc """
  Checks if the flag allows this feature to be used

  ## Examples

    iex> VexillaClient.should?(%{"untagged" => %{"billing" => %{"type" => "toggle","value" => false}}}, "billing", "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a")
    false

  """
  def should?(flags, flagName, instance_id) do
    feature = flags["untagged"][flagName]
    inner_should?(feature, instance_id)
  end

  @doc """
  Checks if the flag allows this feature to be used

  ## Examples

    iex> VexillaClient.should?(%{"features" => %{"billing" => %{"type" => "toggle","value" => false}}}, "billing", "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a", "features")
    false

  """
  def should?(flags, flagName, instance_id, groupName) do
    feature = flags[groupName][flagName]
    inner_should?(feature, instance_id)
  end

  defp inner_should?(feature, instance_id) do
    case feature["type"] do
      "toggle" -> feature["value"]
      "gradual" -> should_gradual?(feature["value"], instance_id, feature["seed"])
    end
  end

  defp should_gradual?(value, instance_id, seed) do
    hash_instance_id(instance_id, seed) <= value
  end

  defp hash_instance_id(instance_id, seed) do
    characters = String.to_charlist(instance_id)
    character_total = Enum.sum(characters)

    rem(Kernel.trunc(Float.floor(character_total * seed * 42.0)), 100)
  end
end
