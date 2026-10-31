# Vexilla Client - Go

This is the Go client library for Vexilla, a static file-based VCS-native feature flag system.

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

Add the module to your Go project:

```sh
go get github.com/vexilla/vexilla/clients/go
```

Import the client package:

```go
import "github.com/vexilla/vexilla/clients/go/pkg/vexilla"
```


### Setup

You will need to create a Client within your app. This optionally takes in the `InstanceId` for use with gradual rollout as well as Selective features.

Create a client with your environment, publication base URL, instance ID, and logging preference. Call `SyncManifest` before `SyncFlags` so the client can resolve group names. Both methods update the client and return an error; they do not return a client for chaining. Pass a fetch callback such as `http.Get` to each synchronization call.

Replace the URL, environment, instance ID, and group/feature names below with values from your publication. These examples use the `Gradual` group from the repository fixtures.


**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```go
client := vexilla.NewClient(
    "dev",
    "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com",
    "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a",
    false,
)

if err := client.SyncManifest(http.Get); err != nil {
    return err
}
if err := client.SyncFlags("Gradual", http.Get); err != nil {
    return err
}
```

This setup fragment belongs in a function returning `error`; the full example includes all imports and a `main` function.


### Usage

Use the created client to check if a feature `Should` be on.

```go
enabled, err := client.Should("Gradual", "testingWorkingGradual")
if err != nil {
    return err
}
if enabled {
    // Enable the feature.
}
```

A `false` result with a `nil` error is a successful evaluation of a disabled feature.


### Full Example

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "time"

    "github.com/vexilla/vexilla/clients/go/pkg/vexilla"
)

func run() error {
    client := vexilla.NewClient(
        "dev",
        "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com",
        "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a",
        false,
    )
    httpClient := &http.Client{Timeout: 10 * time.Second}

    if err := client.SyncManifest(httpClient.Get); err != nil {
        return fmt.Errorf("sync manifest: %w", err)
    }
    if err := client.SyncFlags("Gradual", httpClient.Get); err != nil {
        return fmt.Errorf("sync group: %w", err)
    }

    enabled, err := client.Should("Gradual", "testingWorkingGradual")
    if err != nil {
        return fmt.Errorf("evaluate feature: %w", err)
    }
    if enabled {
        fmt.Println("Feature enabled")
    } else {
        fmt.Println("Feature disabled")
    }
    return nil
}

func main() {
    if err := run(); err != nil {
        log.Fatal(err)
    }
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

Group, environment, and feature keys accept their publication IDs, names, or normalized names. Install the manifest and the relevant group before evaluating a feature.

| Operation | Parameters and result |
| --- | --- |
| `NewClient(environment, baseURL, customInstanceHash, showLogs)` | Returns a `Client`. The first two arguments are strings, the instance is an `interface{}`, and logging is a boolean. Use a string, integer, or finite float instance for gradual/selective features. |
| `client.GetManifest(fetch)` | Fetches and parses `manifest.json`; returns the manifest and an error without installing it. |
| `client.SetManifest(manifest)` | Validates and installs a manifest snapshot, rebuilds aliases, and removes cached groups that no longer match. Returns an error. |
| `client.SyncManifest(fetch)` | Fetches and installs the manifest; returns an error. |
| `client.GetFlags(group, fetch)` | Resolves the group, fetches `<group-id>.json`, and validates it against the installed manifest. Returns the group and an error without installing it. |
| `client.SetFlags(group)` | Validates and installs a group snapshot and its lookup tables. Requires a matching installed manifest; returns an error. |
| `client.SyncFlags(group, fetch)` | Fetches and installs the named group; returns an error. |
| `client.Should(group, feature)` | Returns `(bool, error)` for a toggle, gradual, or selective feature using the configured instance. |
| `client.ShouldCustomString(group, feature, instance)` | Evaluates with a string instance; returns `(bool, error)`. |
| `client.ShouldCustomInt(group, feature, instance)` | Evaluates with an `int64` instance; returns `(bool, error)`. |
| `client.ShouldCustomFloat(group, feature, instance)` | Evaluates with a finite `float64` instance; returns `(bool, error)`. |
| `client.ValueString(group, feature, defaultValue)` | Returns `(string, error)` for a string value feature. |
| `client.ValueInt(group, feature, defaultValue)` | Returns `(int64, error)` for an integer value feature. |
| `client.ValueFloat(group, feature, defaultValue)` | Returns `(float64, error)` for a float value feature. |

The fetch callback has signature `func(url string) (*http.Response, error)`. The client reads and closes the response body, rejects non-2xx responses, and parses the original JSON. Supply transport timeouts through your HTTP client.

Always check returned errors: fetch, JSON/validation, lookup, instance, and feature-kind errors do not mean that a feature is disabled. An inactive schedule produces `false, nil` for boolean evaluation or `defaultValue, nil` for value access. Value methods also return the supplied default alongside an error on lookup or kind failure; the default does not make that failure a successful operation. `SetManifest`, `SetFlags`, and sync methods update the client in place.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types go REMOTE_JSON_URL
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
