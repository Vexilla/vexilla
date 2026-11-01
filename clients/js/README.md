# Vexilla Client - JS/TS

This is the JS/TS client library for Vexilla, a static file-based VCS-native feature flag system.

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

Using npm or yarn, install the package. TypeScript types are shipped with it.

```sh
npm install --save @vexilla/client
```

or

```sh
yarn add @vexilla/client
```


### Setup

You will need to create a Client within your app. This optionally takes in the `customInstanceId` for use with gradual rollout as well as Selective features.

After constructing the client, await `syncManifest(fetchJson)`, then await `syncFlags(groupNameOrId, fetchJson)` for every group you need. Evaluate flags only after those promises resolve. These methods install the fetched data and return `Promise<void>`; they do not return a chainable client.

The examples use ES modules and a runtime providing native `fetch` and `structuredClone`, such as Node.js. The fetch callback must return decoded JSON, not a `Response` or JSON string. Replace the publication URL, environment, group, and feature with values from your publication. Let initialization failures reach your application's error handler; the full example shows a Node.js entry point with explicit error handling.


**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```javascript
import { VexillaClient } from '@vexilla/client';

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.json();
}

const userId = 'user-123';
const client = new VexillaClient({
  baseUrl: 'https://flags.example.com',
  environment: 'production',
  customInstanceId: userId
});

// Run during async startup, before evaluating any flags.
await client.syncManifest(fetchJson);
await client.syncFlags('Checkout', fetchJson);
```


### Usage

Use the created client to check if a feature `should` be on.

```javascript
// After the setup promises have resolved:
if (client.should('Checkout', 'New checkout')) {
  console.log('Feature enabled');
} else {
  console.log('Feature disabled');
}
```


### Full Example

Save this example as `feature-flags.mjs` and run it with a Node.js runtime providing native `fetch` and `structuredClone`.

```javascript
import { VexillaClient } from '@vexilla/client';

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.json();
}

async function main() {
  const userId = 'user-123';
  const client = new VexillaClient({
    baseUrl: 'https://flags.example.com',
    environment: 'production',
    customInstanceId: userId
  });

  await client.syncManifest(fetchJson);
  await client.syncFlags('Checkout', fetchJson);

  if (client.should('Checkout', 'New checkout')) {
    console.log('Feature enabled');
  } else {
    console.log('Feature disabled');
  }
}

main().catch((error) => {
  console.error('Feature flag initialization or evaluation failed:', error);
  process.exitCode = 1;
});
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

The signatures below use the public TypeScript types exported by `@vexilla/client`; the examples above are plain JavaScript. Group, feature, and environment lookups accept either names or IDs. Install the manifest and each required group before evaluating flags.

### `constructor(config: VexillaClientConfig, showLogs = false)`

Creates a client without fetching any data. `config` contains:

- `baseUrl: string`: The publication's base URL, without a trailing slash. The client appends `/manifest.json` or `/<groupId>.json` when fetching.
- `environment?: string`: The environment name or ID. Defaults to `"prod"`.
- `customInstanceId?: string | number`: The default instance ID, often a user ID, for gradual and selective flags. Evaluation of these flags requires a finite number or a well-formed Unicode string; toggles do not require an instance ID.
- `experimental?: { telemetryHook: TelemetryHook }`: Accepted by the configuration type, but the current client does not invoke this hook. `TelemetryHook` has signature `(featureFlag: VexillaFeature, flagResult: string | number) => void | Promise<void>`.

The optional second argument, `showLogs`, enables operation and safe-fallback logs.

### `FetchHook<T> = (url: string) => Promise<T>`

Every fetch method requires a callback that resolves to decoded JSON of the indicated type. The callback chooses the HTTP library, checks HTTP status, and parses the response. A callback rejection becomes a `VexillaError` with `kind: "fetch"`. Invalid publication data produces `kind: "validation"`.

### `getManifest(fetchHook: FetchHook<VexillaManifest>): Promise<VexillaManifest>`

Fetches `/manifest.json`, validates it, and returns a snapshot without installing it. Call `await setManifest(manifest)` to install it, or use `syncManifest` for both steps.

### `setManifest(manifest: VexillaManifest): Promise<void>`

Validates and installs a manifest snapshot and its group lookup table. Removes installed groups that no longer match the manifest. Await this method before fetching or installing groups.

### `syncManifest(fetchHook: FetchHook<VexillaManifest>): Promise<void>`

Fetches, validates, and installs the manifest. Await completion before synchronizing groups.

### `getFlags(groupNameOrId: string, fetchHook: FetchHook<VexillaGroup>): Promise<VexillaGroup>`

Requires an installed manifest. Resolves the group's name or ID, fetches `/<groupId>.json`, validates it against the manifest, and returns a snapshot without installing it. Call `setFlags(flags)` to install it, or use `syncFlags` for both steps.

### `setFlags(flags: VexillaGroup): void`

Requires an installed manifest. Validates and installs a group snapshot and its feature and environment lookup tables. The group ID comes from `flags.groupId`; there is no separate group argument.

### `syncFlags(groupNameOrId: string, fetchHook: FetchHook<VexillaGroup>): Promise<void>`

Fetches, validates, and installs a group. Await completion before evaluating that group's flags.

The fetch and install methods also accept the legacy compatibility shapes. The canonical public types for v1 publications are `VexillaManifest` and `VexillaGroup`.

### `should(groupNameOrId: string, featureName: string, customInstanceId?: string | number): boolean`

Evaluates a toggle, gradual, or selective feature. `featureName` accepts a name or ID. The optional `customInstanceId` overrides the constructor's instance ID for this evaluation, preserving its string or number type for selective comparisons. Returns `false` outside an active schedule. Missing data, invalid instance IDs, and using this method on a value feature throw errors.

### `safeShould(groupNameOrId: string, featureName: string, customInstanceId?: string | number): boolean`

Calls `should` and returns `false` if evaluation throws. It does not fetch or install missing data.

### `value(groupNameOrId: string, featureName: string, defaultValue: string | number | null = null): string | number | null`

Reads a value feature in the configured environment. Returns `defaultValue` outside the feature's active schedule, and otherwise returns the published value, including `0` or an empty string. Missing groups, environments, or features throw lookup errors; using this method on a non-value feature throws a kind error. The default does not hide these failures or fetch failures.

### `safeValue(groupNameOrId: string, featureName: string, defaultValue: string | number | null = null): string | number | null`

Calls `value` and also returns `defaultValue` if evaluation throws. Active `0` and empty-string values are preserved.

### `VexillaError`

Import `VexillaError` from `@vexilla/client` to inspect failures. Its `kind` is `"validation"`, `"lookup"`, `"kind"`, `"instance"`, or `"fetch"`. Async methods reject; synchronous install and evaluation methods throw. The safe evaluation methods catch errors and return their documented fallback.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types js REMOTE_JSON_URL
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
