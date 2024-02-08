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

Add the client to your imports.

```rust
vexilla_client = "1.x.x"
```


### Setup

You will need to create a Client within your app. This optionally takes in the `custom_instance_hash` for use with gradual rollout as well as Selective features.

After creation, call `sync_flags_blocking`. This can be chained from the constructor since it returns the client instance.

**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```rust
let mut client = VexillaClient::new("dev", "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com", user_id);

client.sync_manifest(|url| reqwest::blocking::get(url).unwrap().text().unwrap());

client
  .sync_flags("Scheduled", |url| {
      reqwest::blocking::get(url).unwrap().text().unwrap()
  })
  .unwrap();
```


### Usage

Use the created client to check if a feature `Should` be on.

```rust
let should_show_feature = client.should(FEATURE_NAME)
```


### Full Example

```rust
let mut client = VexillaClient::new("dev", "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com", user_id);

client.sync_manifest(|url| reqwest::blocking::get(url).unwrap().text().unwrap());

client
  .sync_flags("Scheduled", |url| {
      reqwest::blocking::get(url).unwrap().text().unwrap()
  })
  .unwrap();

if client.should(FEATURE_NAME) {
  // Do the thing
}
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

### `pub fn new( environment: &'static str, base_url: &'static str, instance_id: &'static str) -> VexillaClient`

Returns a new instance of the Vexilla client

#### Arguments

- environment `&'static str`: The name or ID of the environment you are targeting. This will be used in the lookups of flags and their config.

- base_url `&'static str`: The base URL where your JSON files are stored. When fetching flags Vexilla will append the coerced file name to the url. No trailing slash.

- instance_id `&'static str`: The ID, often for a user, to use by default for determining gradual flags and selective flags.

### `pub fn get_manifest(&self, fetch: Callback) -> Result<Manifest>`

Fetches the manifest file for facilitating name->id lookups. Does not set the value on the client. You would need to call `set_manifest` after. Alternatively, you can use `sync_manifest` to do both steps with less code.

#### Arguments

- fetch `fn(url: &str) -> String`: A callback that is passed the url of the manifest file. You can bring your own http request library.

### `pub fn set_manifest(&mut self, manifest: Manifest)`

Sets a fetched manifest within the Client instance.

#### Arguments

- manifest `Manifest`: The manifest file to persist into the client. Usually fetched via `get_manifest`.

### `pub fn sync_manifest(&mut self, fetch: Callback)`

Fetches and sets the manifest within the client to facilitate name->Id lookups.

#### Arguments

- fetch `fn(url: &str) -> String`: A callback that is passed the url of the manifest file. You can bring your own http request library.

### `pub fn get_flags(&self, file_name: &str, fetch: Callback) -> VexillaResult<FlagGroup>`

Fetches the flags for a specific flag_group. Can use the ID or the name of the group for the lookup.

#### Arguments

- file_name `&str`: The Name or ID of the flag group you would like to fetch.

- fetch `fn(url: &str) -> String`: A callback that is passed the url of the flag group file. You can bring your own http request library.

### `pub fn set_flags(&mut self, group_id: &str, flags: FlagGroup)`

Sets a fetched flag group within the Client instance.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to set.

- flags `FlagGroup`: The collection of flags you would like to set. Typically from a `get_flags` call. `sync_flags` wraps both functions to streamline the process.

### pub fn sync_flags(&mut self, file_name: &str, fetch: Callback) -> VexillaResult<(), VexillaError>

Fetches and sets the flag group within the client to facilitate name->Id lookups.

#### Arguments

- file_name `&str`: The Name or ID of the flag group you would like to fetch.

- fetch `fn(url: &str) -> String`: A callback that is passed the url of the flag group file. You can bring your own http request library.

### pub fn should(&self, group_id: &'static str, feature_name: &'static str) -> VexillaResult<bool>

Checks if a toggle, gradual, or selective flag should be enabled. Other methods exist for other flag types, such as value.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to check.

- feature_name `&str`: The ID or name of the feature flag that you would like to check.

### pub fn should_custom_str(&self, group_id: &str, feature_name: &str, custom_id: &str) -> VexillaResult<bool>

Similar to the `should` method, but allows passing a custom string for use in the same way `custom_hash_id` is used from the contructor. This can be especially useful for Selective flags that target groups instead of individual user IDs.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to check.

- feature_name `&str`: The ID or name of the feature flag that you would like to check.

custom_id `&str`: The custom string you would like to evaluate in a gradual check or selective check.

### pub fn should_custom_int(&self, group_id: &str, feature_name: &str, custom_id: i64) -> VexillaResult<bool>

Similar to the `should` method, but allows passing a custom integer for use in the same way `custom_hash_id` is used from the contructor. This can be especially useful for Selective flags that target groups instead of individual user IDs.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to check.

- feature_name `&str`: The ID or name of the feature flag that you would like to check.

custom_id `i64`: The custom integer you would like to evaluate in a gradual check or selective check.

### pub fn should_custom_float(&self, group_id: &str, feature_name: &str, custom_id: f64) -> VexillaResult<bool>

Similar to the `should` method, but allows passing a custom float for use in the same way `custom_hash_id` is used from the contructor. This can be especially useful for Selective flags that target groups instead of individual user IDs.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to check.

- feature_name `&str`: The ID or name of the feature flag that you would like to check.

custom_id `f64`: The custom float you would like to evaluate in a gradual check or selective check.

### pub fn value_str(&self, group_id: &str, feature_name: &str, default: &'static str) -> VexillaResult<String>

Gets a string value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to check.

- feature_name `&str`: The ID or name of the feature flag that you would like to check.

- default `&str`: The default string value if the flag is off via scheduling or cannot be fetched.

### pub fn value_int(&self, group_id: &str, feature_name: &str, default: i64) -> VexillaResult<i64>

Gets an integer value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to check.

- feature_name `&str`: The ID or name of the feature flag that you would like to check.

- default `i64`: The default integer value if the flag is off via scheduling or cannot be fetched.

### pub fn value_float(&self, group_id: &str, feature_name: &str, default: f64) -> VexillaResult<f64>

Gets a float value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- group_id `&str`: The ID or name of the flag group that you would like to check.

- feature_name `&str`: The ID or name of the feature flag that you would like to check.

- default `f64`: The default float value if the flag is off via scheduling or cannot be fetched.



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
