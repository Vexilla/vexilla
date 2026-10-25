# Vexilla Client - Lua

This is the Lua client library for Vexilla, a static file-based VCS-native feature flag system.

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

From this monorepo checkout, build the development rock with LuaRocks 3.13.0:

```sh
cd clients/lua
luarocks make vexilla_client-scm-1.rockspec
```

The import remains `require("vexilla_client")`. LuaSocket 3.1.0 provides a millisecond wall clock. HTTP and JSON libraries are chosen by the application; dkjson 2.11 is used only by the examples and tests.

Verified runtimes are Lua 5.1.5, 5.2.4, 5.3.6, 5.4.9, 5.5.1, and LuaJIT 2.1.1792527110. Run `node contract/scripts/setup-lua.cjs` from the repository root to build pinned, isolated toolchains, then `node contract/scripts/run.cjs lua` after generating the shared artifacts. Every advertised runtime is required; missing tools fail verification.


### Setup

You will need to create a Client within your app. This optionally takes in the `custom_instance_id` for use with gradual rollout as well as Selective features.

Create a client with a configuration table, then call `sync_manifest(fetch)` followed by `sync_flags(group, fetch)`. Sync methods return no value. Getters validate and return data without installing it; setters install independent validated snapshots.

**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```lua
local Client = require("vexilla_client")
local client = Client.new({
  base_url = "https://flags.example.com",
  environment = "prod",
  custom_instance_id = "user-123", -- optional for toggles and values
  show_logs = false,
})
client:sync_manifest(fetch)
client:sync_flags("Checkout", fetch)
```

`fetch(url)` must return a decoded v1 manifest or group table and raise an error on transport failure. Preserve JSON nulls and array/object identity when decoding, for example with `dkjson.decode(text, 1, dkjson.null)`. Plain empty tables are interpreted according to their field; explicit decoder array/object tags are validated. Fetch failures and invalid refreshes preserve the installed snapshot.

Set `show_logs = true` to write manifest/group fetch and installation outcomes to standard error. Logging is disabled by default, includes failures without swallowing them, and excludes instance IDs, feature values, URLs, and raw callback errors. Each event identifies its operation and outcome, for example `vexilla operation=manifest.install outcome=success`.


### Usage

Use the created client to check if a feature `should` be on.

```lua
if client:should("Checkout", "New Checkout") then
  -- Enable the feature for the configured instance.
end
local enabled = client:should("Checkout", "Gradual", "another-user")
local title = client:value("Checkout", "Title", "Checkout")
```

Group, environment, and feature lookups accept IDs, exact names, and normalized name aliases. Gradual and selective evaluations require a finite numeric or string instance ID. Numeric and string IDs remain distinct for selective features. Value access returns the caller's default when inactive, while active zero and empty strings remain values. Wrong feature-kind operations raise errors before scheduling fallbacks.


### Full Example

The offline example below uses the same callback boundary as an HTTP implementation. After `pnpm contract:generate`, run it with `VEXILLA_CONTRACT_DIR` pointing at `.contract-artifacts` and the installed rock on your Lua path:

```lua
local Client = require("vexilla_client")
local json = require("dkjson")
local artifacts = assert(os.getenv("VEXILLA_CONTRACT_DIR"))
local function fetch(url)
  local file = assert(io.open(artifacts .. "/" .. assert(url:match("([^/]+)$")), "rb"))
  local text = file:read("*a"); file:close()
  local value, _, err = json.decode(text, 1, json.null)
  assert(not err, err)
  return value
end
local client = Client.new({base_url = "https://contract", environment = "prod", custom_instance_id = "member"})
client:sync_manifest(fetch)
client:sync_flags("Contract", fetch)
assert(client:should("Contract", "Toggle"))
assert(client:should("Contract", "Selective Int", 42))
assert(client:value("Contract", "Value String", "fallback") == "hello")
```

The executable version is `examples/contract.lua`. Native verification installs the rock into a fresh tree and runs the example and complete contract under every supported interpreter.


## What are Feature Flags?

Feature flags are useful for enabling or disabling parts of your application without having to redeploy. In some cases, such as mobile applications, the redeploy could take up to a week.

See more about them here:

- [https://featureflags.io](https://featureflags.io)
- [https://en.wikipedia.org/wiki/Feature_toggle](https://en.wikipedia.org/wiki/Feature_toggle)

Feature Flags are also a fundamental building block for things such as A/B testing.

## How does it work?

The process is simple but has several steps to get up and running. Please see our in-depth guides in our [documentation](https://vexilla.dev/documentation).

## API

- `Client.new(config, show_logs)` creates an isolated client. Configuration fields are `base_url`, `environment` (default `prod`), optional `custom_instance_id`, and optional `show_logs`.
- `get_manifest(fetch)` / `set_manifest(manifest)` / `sync_manifest(fetch)` fetch, install, or combine those operations.
- `get_flags(group, fetch)` / `set_flags(group)` / `sync_flags(group, fetch)` do the same for groups listed in the manifest.
- `should(group, feature, optional_instance_id)` evaluates toggle, gradual, and selective string/int/float features.
- `value(group, feature, default_value)` reads value string/int/float features.

Gradual hashing uses UTF-8 FNV-1a and an untruncated binary64 seeded bucket with strict `<` comparison. Schedules use inclusive UTC millisecond boundaries, including overnight daily windows. Timezone labels are validated for compatibility and retain UTC evaluation.

This migration replaces the legacy positional constructor, `fetch_flags("features.json")`, single-file/`untagged` format, and `should(feature)` API with v1 manifest/group operations. `Client` is local to the module. There is no mandatory HTTP transport or RapidJSON dependency. Saved v1 data must satisfy the existing publisher's structural and identity rules; clients do not coerce or repair malformed values. Package release versions and publication are a separate release action.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types lua REMOTE_JSON_URL
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
