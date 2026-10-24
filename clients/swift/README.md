# Vexilla Client - Swift

This is the Swift client library for Vexilla, a static file-based VCS-native feature flag system.

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

Add the repository as a Swift Package dependency and select the `VexillaClient` library product.


### Setup

You will need to create a Client within your app. This optionally takes in the `instanceId` for use with gradual rollout as well as Selective features.

Fetch and install the manifest first, then sync each group you need. Getters validate without installing; setters install owned snapshots, and sync methods combine those steps.

**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```swift
var client = VexillaClient(
    environment: "prod",
    baseUrl: "https://flags.example.com",
    instanceId: "user-123"
)
try await client.syncManifest(fetch: fetch)
try await client.syncFlags(groupNameOrId: "Checkout", fetch: fetch)
```


### Usage

Use the created client to check if a feature `should` be on.

```swift
let enabled = try client.should(groupNameOrId: "Checkout", featureNameOrId: "New Checkout")
let title = try client.valueString(groupNameOrId: "Checkout", featureNameOrId: "Title", defaultString: "Checkout")
```


### Full Example

```swift
import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import VexillaClient

func fetch(url: URL) async throws -> Data {
    try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: url) { data, _, error in
            if let error = error {
                continuation.resume(throwing: error)
            } else if let data = data {
                continuation.resume(returning: data)
            } else {
                continuation.resume(throwing: URLError(.badServerResponse))
            }
        }.resume()
    }
}

var client = VexillaClient(environment: "prod", baseUrl: "https://flags.example.com", instanceId: "user-123")
try await client.syncManifest(fetch: fetch)
try await client.syncFlags(groupNameOrId: "Checkout", fetch: fetch)
let enabled = try client.should(groupNameOrId: "Checkout", featureNameOrId: "New Checkout")
```

Callbacks return original JSON bytes. For direct ingestion use `try Manifest.decode(data:)` and `try Group.decode(data:)`, then the throwing setters. `StringMap` keeps canonically equivalent but byte-distinct IDs separate. Invalid refreshes preserve installed snapshots. See the repository's `contract/MIGRATION.md` before upgrading.


## What are Feature Flags?

Feature flags are useful for enabling or disabling parts of your application without having to redeploy. In some cases, such as mobile applications, the redeploy could take up to a week.

See more about them here:

- [https://featureflags.io](https://featureflags.io)
- [https://en.wikipedia.org/wiki/Feature_toggle](https://en.wikipedia.org/wiki/Feature_toggle)

Feature Flags are also a fundamental building block for things such as A/B testing.

## How does it work?

The process is simple but has several steps to get up and running. Please see our in-depth guides in our [documentation](https://vexilla.dev/documentation).

## API



## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types swift REMOTE_JSON_URL
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
