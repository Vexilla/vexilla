# Vexilla Client - Elixir

This is the Elixir client library for Vexilla, a static file-based VCS-native feature flag system.

## Table of Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Setup](#setup)
  - [Usage](#usage)
  - [Full Example](#full-example)
- [What are feature flags?](#what-are-feature-flags)
- [How does it work?](#how-does-it-work)
- [Support](#support)
- [API](#api)
- [Generate Types](#generate-types-optional)
- [Contributing](#contributing)

## Getting Started

To get started is easy. Follow these steps to get started with integration.

### Installation

Add the `vexilla_client` dependency to your project's `mix.exs`:

```elixir
defp deps do
  [
    {:vexilla_client, "~> 1.0"}
  ]
end
```

Then run `mix deps.get`. The client requires Elixir 1.15 or later and includes HTTPoison and Jason dependencies, which the examples below use.


### Setup

You will need to create a Client within your app. This optionally takes in the `instance_id` for use with gradual rollout as well as Selective features.

The client is an immutable configuration map. Fetch and install the manifest first, then sync each group you need. Setters and sync functions return a new config: rebind it or thread it through a pipeline. Getters fetch and validate data without installing it; evaluation reads only the installed config.

Replace the base URL, environment, group/feature names, and instance ID in these examples with your publication and application values. The examples use groups from the repository's test fixtures.

**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```elixir
HTTPoison.start()

fetch = fn url -> HTTPoison.get!(url).body end

config =
  VexillaClient.create_config("https://flags.example.com", "dev", "user-123")
  |> VexillaClient.sync_manifest!(fetch)
  |> VexillaClient.sync_flags!("Gradual", fetch)
```


### Usage

Use the created client to check if a feature `should!` be on.

```elixir
enabled = VexillaClient.should!(config, "Gradual", "testingWorkingGradual")

if enabled do
  IO.puts("Feature enabled")
end
```


### Full Example

```elixir
HTTPoison.start()

# Return the original JSON body; the client decodes and validates it.
fetch = fn url -> HTTPoison.get!(url).body end

config =
  VexillaClient.create_config(
    "https://flags.example.com",
    "dev",
    "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
  )
  |> VexillaClient.sync_manifest!(fetch)
  |> VexillaClient.sync_flags!("Gradual", fetch)

if VexillaClient.should!(config, "Gradual", "testingWorkingGradual") do
  IO.puts("Feature enabled")
end

# Retain the returned config when installing another group.
config = VexillaClient.sync_flags!(config, "Value", fetch)
title = VexillaClient.value!(config, "Value", "String", "Default title")
IO.puts(title)
```


## What are Feature Flags?

Feature flags are useful for enabling or disabling parts of your application without having to redeploy. In some cases, such as mobile applications, the redeploy could take up to a week.

See more about them here:

- [https://featureflags.io](https://featureflags.io)
- [https://en.wikipedia.org/wiki/Feature_toggle](https://en.wikipedia.org/wiki/Feature_toggle)

Feature Flags are also a fundamental building block for things such as A/B testing.

## How does it work?

The process is simple but has several steps to get up and running. Please see our in-depth guides in our [documentation](https://vexilla.dev/documentation).

## API

All functions are in `VexillaClient`. Group, environment, and feature identifiers accept their published IDs or names. Install a manifest before fetching or installing groups, and install a group before evaluating its features.

| Function | Behavior and return value |
| --- | --- |
| `create_config(base_url, environment, instance_id, show_logs \\ false)` | Returns a config map. `base_url` hosts `manifest.json` and group JSON files; `environment` selects the environment. The instance ID is used for gradual and selective evaluation; strings and finite numbers are supported. `show_logs` enables operation diagnostics. |
| `get_manifest!(config, fetch)` | Calls `fetch.(url)` for `manifest.json` and returns the validated manifest map without installing it. |
| `set_manifest(config, manifest)` | Validates and installs a manifest map, returning a new config. Removes installed groups no longer matching the manifest's IDs and names. |
| `sync_manifest!(config, fetch)` | Fetches and installs the manifest, returning a new config. |
| `get_flags!(config, group_name_or_id, fetch)` | Fetches `<group-id>.json`, validates it against the manifest, and returns the group map without installing it. |
| `set_flags(config, group)` | Validates and installs a group map, returning a new config with its lookup tables. |
| `sync_flags!(config, group_name_or_id, fetch)` | Fetches and installs a group, returning a new config. |
| `should!(config, group_name_or_id, feature_name_or_id)` | Returns a boolean for a toggle, gradual, or selective feature using the config's instance ID. An inactive schedule returns `false`. |
| `should_custom!(config, group_name_or_id, feature_name_or_id, custom_instance_id)` | Evaluates a boolean feature with a string or numeric instance ID supplied for this call. |
| `value!(config, group_name_or_id, feature_name_or_id, default_value)` | Returns an active value feature's string or number, or `default_value` when its schedule is inactive. |

The fetch callback receives a URL and may return original JSON text or a decoded map with string keys. The examples use HTTPoison, but any HTTP library can supply this callback.

Fetch failures, invalid publications, missing lookups, invalid instance IDs, and feature-kind mismatches raise `VexillaContractError` (with a `kind` and `message`). The setters also validate and can raise despite having no `!` suffix. Calling `should!` on a value feature or `value!` on a boolean feature raises a kind error. A value default applies only to an inactive schedule; it does not hide missing groups/features or validation errors. Active zero and empty-string values are returned as stored.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types elixir REMOTE_JSON_URL
```

### Automatic Install Script

You can also use a precompiled binary for your platform. This install script will automatically choose the right binary for you:

```
curl -o- -s https://raw.githubusercontent.com/vexilla/vexilla/main/install.sh | bash
```

The install script also accepts a target install path:

```
curl -o- -s https://raw.githubusercontent.com/vexilla/vexilla/main/install.sh | bash -s -- -b /usr/local/bin/
```

### Manual Installation

If you prefer to download the binary manually you can get it from the releases section in Github, [https://github.com/vexilla/vexilla/releases](https://github.com/vexilla/vexilla/releases)

## Support

Have you run into a bug? Is there a feature you feel is missing? Feel free to create a [GitHub Issue](https://github.com/vexilla/vexilla/issues).

Another way to get support or help is to reach out in our [Discord community](https://discord.gg/GbJu3d93TC).

## Contributing

Would you like to contribute to this client SDK? There are many ways you can help. Reporting issues or creating PRs are the most obvious. Helping triage the issues and PRs of others would also be a huge help. Being a vibrant member of the community on [Discord](https://discord.gg/GbJu3d93TC) is another way to help out.

If you would like to contribute to the app, docs, or other parts of the project, please go see our [Contribution Guide](https://vexilla.dev/documentation/contributing).

## Using Vexilla in production?

We would love to add your company's logo to our usage section on the website. Please submit your name and logo url in [this issue](https://github.com/vexilla/vexilla/issues/25).

## Sponsors

No sponsors yet. This could be a link and icon for **your** company here.

## License

Current Vexilla code is released under a combination of two licenses, the Business Source License (BSL) and the MIT License.

Please see the [License file](../../../LICENSE) for more info.
