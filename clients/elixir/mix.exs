defmodule VexillaClient.MixProject do
  use Mix.Project

  def project do
    [
      app: :vexilla_client_elixir,
      version: "1.0.0",
      elixir: "~> 1.15",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      description: "An elixir client for the Vexilla feature flag system",
      package: %{
        licenses: [
          "MIT"
        ],
        links: %{
          Github: "https://github.com/Vexilla/vexilla/tree/main/clients/elixir"
        }
      },
      test_coverage: [
        ignore_modules: [
          FeatureType,
          ScheduleType,
          TimeType,
          ValueType
        ]
      ]
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger, :httpoison]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:ex_doc, ">= 0.0.0", only: :dev, runtime: false},
      {:typed_struct, "~> 0.3.0", runtime: false},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:timex, "~> 3.0"},
      {:httpoison, "~> 2.0", only: [:dev, :test]},
      {:jason, "~> 1.4", only: [:dev, :test]}
    ]
  end
end
