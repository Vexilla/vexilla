# Vexilla Client - PHP

This is the PHP client library for Vexilla, a static file-based VCS-native feature flag system.

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

Install with Composer on PHP 7.4:

```sh
composer require vexilla/client
```


### Setup

You will need to create a Client within your app. This optionally takes in the `customInstanceHash` for use with gradual rollout as well as Selective features.

Fetch and install the manifest first, then sync each group you need. Getters validate without installing; setters install owned snapshots, and sync methods combine those steps. The full example below defines the `$fetch` callback. Replace the example URL, environment, group, feature names, and instance ID with your application's values.

**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```php
$client = new \Vexilla\Client('https://flags.example.com', 'prod', 'user-123');
$client->syncManifest($fetch);
$client->syncFlags('Checkout', $fetch);
```


### Usage

Use the created client to check if a feature `should` be on.

```php
$enabled = $client->should('Checkout', 'New Checkout');
$title = $client->valueString('Checkout', 'Title', 'Checkout');
```


### Full Example

```php
require 'vendor/autoload.php';

$fetch = function (string $url): string {
    $json = file_get_contents($url);
    if ($json === false) {
        throw new \RuntimeException('Unable to fetch flags');
    }
    return $json;
};
$client = new \Vexilla\Client('https://flags.example.com', 'prod', 'user-123');
$client->syncManifest($fetch);
$client->syncFlags('Checkout', $fetch);
$enabled = $client->should('Checkout', 'New Checkout');
$title = $client->valueString('Checkout', 'Title', 'Checkout');
```

Callbacks may return original JSON text or decoded objects. Use `Codec::manifest` and `Codec::group` for direct JSON ingestion, then the native setters. All ingestion validates before installation and preserves the previous snapshot on failure. Numeric IDs use `shouldCustomInt`, `shouldCustomFloat`, or `shouldCustom`; active zero and empty-string values remain actual values. See `contract/MIGRATION.md` before upgrading.


## What are Feature Flags?

Feature flags are useful for enabling or disabling parts of your application without having to redeploy. In some cases, such as mobile applications, the redeploy could take up to a week.

See more about them here:

- [https://featureflags.io](https://featureflags.io)
- [https://en.wikipedia.org/wiki/Feature_toggle](https://en.wikipedia.org/wiki/Feature_toggle)

Feature Flags are also a fundamental building block for things such as A/B testing.

## How does it work?

The process is simple but has several steps to get up and running. Please see our in-depth guides in our [documentation](https://vexilla.dev/documentation).

## API

All methods below belong to `\Vexilla\Client`. Group and feature arguments accept names or IDs; evaluation uses the environment selected by the constructor.

| Method | Behavior and return value |
| --- | --- |
| `new Client($baseUrl, $environment, $customInstanceHash = null, $showLogs = false)` | Creates a client with no installed data. Supply a string or finite numeric instance ID for gradual and selective features. |
| `getManifest($callback): Manifest` | Fetches and validates `manifest.json` without installing it. |
| `setManifest(Manifest $manifest): void` | Validates and installs a manifest snapshot; removes installed groups whose ID/name no longer matches. |
| `syncManifest($callback): void` | Fetches and installs the manifest. |
| `getFlags($groupNameOrId, $callback): Group` | Fetches and validates the group's `<groupId>.json` against the installed manifest, without installing it. |
| `setFlags(Group $flagGroup): void` | Validates and installs a group snapshot that matches the installed manifest. |
| `syncFlags($groupNameOrId, $callback): void` | Fetches and installs a group. |
| `should($groupNameOrId, $featureNameOrId): bool` | Evaluates a toggle, gradual, or selective feature using the configured instance ID. |
| `shouldCustom($groupNameOrId, $featureNameOrId, $customInstanceId): bool` | Evaluates with an explicit string or numeric instance ID. `shouldCustomString`, `shouldCustomInt`, and `shouldCustomFloat` expose the same three arguments and delegate to this method. |
| `value($groupNameOrId, $featureNameOrId, $default)` | Returns a value feature's string, integer, or float value, or `$default` when its schedule is inactive. |
| `valueString($groupNameOrId, $featureNameOrId, string $default): string` | Reads a string value feature. |
| `valueInt($groupNameOrId, $featureNameOrId, int $default): int` | Reads an integer value feature. |
| `valueFloat($groupNameOrId, $featureNameOrId, float $default): float` | Reads a floating-point value feature. |

`Manifest` and `Group` are in `\Vexilla\Types`. Fetch callbacks receive a URL string and return original JSON text or decoded JSON objects. For manual ingestion, `\Vexilla\Codec::manifest($json)` and `\Vexilla\Codec::group($json)` produce the native objects accepted by the setters. Setters and sync methods mutate the client and return `void`; they cannot be chained.

Operations throw `\Vexilla\ContractException` for fetch, validation, lookup, feature-kind, or instance-ID failures; inspect its `$kind` property for the category. Invalid ingestion leaves the previous installed snapshot intact. Boolean evaluation returns `false` for disabled or inactive features. Value methods use the default only when the schedule is inactive: missing groups/features and wrong feature kinds or value subtypes throw instead. Active `0` and `''` values are returned unchanged.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types php REMOTE_JSON_URL
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
