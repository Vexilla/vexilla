# Vexilla Client - Rust

This is the Rust client library for Vexilla, a static file-based VCS-native feature flag system.

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

Add these dependencies to your `Cargo.toml`:

```toml
[dependencies]
vexilla_client = "1.0.1"
reqwest = { version = "0.10", features = ["blocking"] }
```

The examples use `reqwest` for blocking HTTP requests, so your application needs it as a direct dependency. The client version above matches this repository's Cargo metadata.


### Setup

You will need to create a Client within your app. This optionally takes in the `instance_id` for use with gradual rollout as well as Selective features.

Create a client with an environment name or ID, a publication base URL without a trailing slash, and an instance ID. To omit the default instance ID, pass `None::<String>` as the third argument; gradual and selective evaluations require an instance ID.

Call `sync_manifest` before `sync_flags` for each group you need, then evaluate features. These blocking methods return `Result` values that must be handled before using the client; they do not return a client for chaining. Fetch callbacks return JSON text as `Result<String, VexillaError>`.

Replace the URL, environment, instance ID, and group/feature names below with values from your publication. The setup and usage fragments belong in a function returning `Result`; `fetch_text` is defined in the full example.


**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```rust
use vexilla_client::VexillaClient;

let instance_id = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
let mut client = VexillaClient::new("dev", "https://flags.example.com", instance_id);

client.sync_manifest(fetch_text)?;
client.sync_flags("Checkout", fetch_text)?;
```


### Usage

Use the created client to check if a feature `should` be on.

```rust
let enabled = client.should("Checkout", "newCheckout")?;
if enabled {
    println!("Feature enabled");
} else {
    println!("Feature disabled");
}
```

`Ok(false)` means evaluation succeeded and the feature is disabled. `Err(...)` is an evaluation failure, propagated here with `?`.


### Full Example

```rust
use vexilla_client::types::VexillaError;
use vexilla_client::VexillaClient;

fn fetch_text(url: &str) -> Result<String, VexillaError> {
    reqwest::blocking::get(url)
        .map_err(|error| VexillaError::Fetch(error.to_string()))?
        .error_for_status()
        .map_err(|error| VexillaError::Fetch(error.to_string()))?
        .text()
        .map_err(|error| VexillaError::Fetch(error.to_string()))
}

fn main() -> Result<(), VexillaError> {
    let environment = "dev";
    let base_url = "https://flags.example.com";
    let instance_id = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
    let mut client = VexillaClient::new(environment, base_url, instance_id);

    client.sync_manifest(fetch_text)?;
    client.sync_flags("Checkout", fetch_text)?;

    if client.should("Checkout", "newCheckout")? {
        println!("Feature enabled");
    } else {
        println!("Feature disabled");
    }

    Ok(())
}
```

Transport, unsuccessful HTTP status, and response-body errors become `VexillaError::Fetch`. Synchronization and evaluation errors propagate from `main`, producing a nonzero exit status instead of the disabled-feature message.


## What are Feature Flags?

Feature flags are useful for enabling or disabling parts of your application without having to redeploy. In some cases, such as mobile applications, the redeploy could take up to a week.

See more about them here:

- [https://featureflags.io](https://featureflags.io)
- [https://en.wikipedia.org/wiki/Feature_toggle](https://en.wikipedia.org/wiki/Feature_toggle)

Feature Flags are also a fundamental building block for things such as A/B testing.

## How does it work?

The process is simple but has several steps to get up and running. Please see our in-depth guides in our [documentation](https://vexilla.dev/documentation).

## API

The full API documentation can be found at [docs.rs/vexilla_client](https://docs.rs/vexilla_client).

Import `VexillaClient` and `InstanceId` from `vexilla_client`; `VexillaError`, `Manifest`, and `FlagGroup` are in `vexilla_client::types`. Signatures below spell out `Result<T, VexillaError>` rather than the implementation's internal result alias.

Fetch callbacks have the signature `impl FnOnce(&str) -> Result<String, VexillaError>`: they receive the full URL and return JSON text, not a response object or decoded JSON. The client parses and validates the text. Getters fetch and validate without installing data; setters install validated data; sync methods perform both steps. Install the manifest before installing groups and install each required group before evaluation.

Group, environment, and feature lookups accept IDs, names, and normalized names. The constructor's environment and base URL, feature arguments of type `impl Into<&'static str>`, and string defaults require static strings, such as string literals. Group arguments are `&str`.

### `pub fn new(environment: impl Into<&'static str>, base_url: impl Into<&'static str>, instance_id: impl Into<InstanceId>) -> Self`

Creates an unsynchronized client. `environment` selects the environment to evaluate. `base_url` is the publication URL without a trailing slash; the client appends `/manifest.json` or `/<group-id>.json`.

The default `instance_id` supports `&str`, `String`, `i64`, `f64`, and `Option<String>` conversions, or an explicit `InstanceId`. Pass `None::<String>` or `InstanceId::Missing` to omit it. Toggle features do not require an instance ID; gradual and selective evaluations return `InvalidInstanceId` when it is missing or invalid. Numeric instance IDs must be finite and exactly representable as binary64; selective string and number IDs remain distinct.

### `pub fn with_show_logs(self, show_logs: bool) -> Self`

Enables or disables diagnostic events for fetch and install operations. Logging is off by default; enabled events go to standard error. This configuration method returns the client and can be chained from `new`.

### `pub fn get_manifest(&self, fetch: impl FnOnce(&str) -> Result<String, VexillaError>) -> Result<Manifest, VexillaError>`

Fetches and validates `manifest.json` without installing it. Pass the returned manifest to `set_manifest`, or use `sync_manifest`.

### `pub fn set_manifest(&mut self, manifest: Manifest) -> Result<(), VexillaError>`

Validates and installs the manifest and updates group lookup aliases. Installed groups whose identity changed are removed. An invalid replacement returns an error without replacing the current manifest.

### `pub fn sync_manifest(&mut self, fetch: impl FnOnce(&str) -> Result<String, VexillaError>) -> Result<bool, VexillaError>`

Fetches, validates, and installs the manifest. Returns `Ok(true)` on success; the boolean indicates successful installation, not feature evaluation.

### `pub fn get_flags(&self, group: &str, fetch: impl FnOnce(&str) -> Result<String, VexillaError>) -> Result<FlagGroup, VexillaError>`

Resolves `group` through the installed manifest and fetches its JSON file. Validates its data and identity against the manifest without installing it. Pass the returned group to `set_flags`, or use `sync_flags`.

### `pub fn set_flags(&mut self, flags: FlagGroup) -> Result<bool, VexillaError>`

Validates and installs an owned group using its embedded ID, replacing its feature and environment lookup aliases. Takes one argument; no separate group ID is needed. Returns `Ok(true)` on success.

### `pub fn sync_flags(&mut self, group: &str, fetch: impl FnOnce(&str) -> Result<String, VexillaError>) -> Result<(), VexillaError>`

Fetches, validates, and installs the requested group. Returns `Ok(())` on success.

### `pub fn should(&self, group: &str, feature: impl Into<&'static str>) -> Result<bool, VexillaError>`

Evaluates a toggle, gradual, or selective feature in the configured environment, using the default instance ID when needed. With valid data and any required instance ID, returns `Ok(false)` outside an active schedule. Missing installed data, failed lookups, invalid instance IDs, and using a value feature return errors; they are not treated as disabled features.

### `pub fn should_custom(&self, group: &str, feature: impl Into<&'static str>, id: impl Into<InstanceId>) -> Result<bool, VexillaError>`

Evaluates a boolean feature with a per-call instance ID instead of the configured default. Supports the same conversions as `new`; gradual and selective evaluations validate the ID before use.

### `pub fn should_custom_str(&self, group: &str, feature: impl Into<&'static str>, id: &str) -> Result<bool, VexillaError>`

Evaluates with a string instance ID. Useful for selective features that target a team or other group instead of an individual user.

### `pub fn should_custom_int(&self, group: &str, feature: impl Into<&'static str>, id: i64) -> Result<bool, VexillaError>`

Evaluates with an integer instance ID. The integer must be exactly representable as binary64.

### `pub fn should_custom_float(&self, group: &str, feature: impl Into<&'static str>, id: f64) -> Result<bool, VexillaError>`

Evaluates with a finite binary64 instance ID.

### `pub fn value_str(&self, group: &str, key: impl Into<&'static str>, default: &'static str) -> Result<String, VexillaError>`

Reads a string value feature in the configured environment. Returns the supplied default outside its active schedule and preserves an active empty string.

### `pub fn value_int(&self, group: &str, key: impl Into<&'static str>, default: i64) -> Result<i64, VexillaError>`

Reads an integer value feature, returning the default outside its active schedule and preserving active zero.

### `pub fn value_float(&self, group: &str, key: impl Into<&'static str>, default: f64) -> Result<f64, VexillaError>`

Reads a float value feature, returning the default outside its active schedule and preserving active zero.

Value defaults apply only outside an active schedule. Missing groups, environments, or features and incompatible feature/value types return `Err(VexillaError)`; a failed fetch does not turn a value read into a default. Rust has no safe fallback variants of these methods. Handle errors explicitly with `?`, `match`, or your application's chosen fallback policy.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types rust REMOTE_JSON_URL
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
