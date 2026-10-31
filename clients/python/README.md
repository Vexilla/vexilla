# Vexilla Client - Python

This is the Python client library for Vexilla, a static file-based VCS-native feature flag system.

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

Use the client from a source checkout of this repository. The client directory contains `vexilla_client/`, `Pipfile`, and `Pipfile.lock`, but no `pyproject.toml` or `setup.py` for installing a distribution.

The checked-in Pipfile targets Python 3.6. With Pipenv and the matching interpreter available, install the locked dependencies from the repository root:

```sh
cd clients/python
pipenv sync
```

Save the full example as `example.py` in `clients/python`, then run `pipenv run python example.py`. Keeping that directory on Python's import path makes `from vexilla_client import VexillaClient` available. If using the client elsewhere, add the checkout's `clients/python` directory to `PYTHONPATH` and use the same dependency environment. The pinned dependencies include Pydantic 1.x, Arrow, and typing-extensions.


### Setup

You will need to create a Client within your app. This optionally takes in the `custom_instance_id` for use with gradual rollout as well as Selective features.

Fetch and install the manifest first, then sync each group you need. Sync methods and setters mutate the existing client and return `None`; keep using the original client instead of assigning their return values. Getters fetch and validate without installing.

Replace the base URL, environment, group/feature names, and instance ID with your publication and application values. These examples use groups from the repository's test fixtures.

**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```python
from urllib.request import urlopen
from vexilla_client import VexillaClient

def fetch(url):
    with urlopen(url, timeout=10) as response:
        return response.read()

client = VexillaClient("https://flags.example.com", "dev", "user-123")
client.sync_manifest(fetch)
client.sync_flags("Gradual", fetch)
```


### Usage

Use the created client to check if a feature `should` be on.

```python
enabled = client.should("Gradual", "testingWorkingGradual")
if enabled:
    print("Feature enabled")
```


### Full Example

```python
from urllib.request import urlopen
from vexilla_client import VexillaClient

def fetch(url):
    # Return original JSON bytes, without decoding to a dict.
    with urlopen(url, timeout=10) as response:
        return response.read()

client = VexillaClient(
    "https://flags.example.com",
    "dev",
    "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a",
)
client.sync_manifest(fetch)
client.sync_flags("Gradual", fetch)

if client.should("Gradual", "testingWorkingGradual"):
    print("Feature enabled")

client.sync_flags("Value", fetch)
title = client.value("Value", "String", "Default title")
print(title)
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

Import `VexillaClient` from `vexilla_client`. Group, environment, and feature identifiers accept published IDs or names. Install the manifest before fetching or installing groups, and install each group before evaluating its features.

| Method | Behavior and return value |
| --- | --- |
| `VexillaClient(base_url, environment, custom_instance_id, show_logs=False)` | Creates a client for a publication URL and environment. The instance ID is used for gradual and selective features; `show_logs` enables Python logging diagnostics. |
| `get_manifest(fetch)` | Fetches `manifest.json`, returning a validated `Manifest` model without installing it. |
| `set_manifest(manifest)` | Validates and installs a `Manifest` model, removes groups no longer matching its IDs/names, and returns `None`. |
| `sync_manifest(fetch)` | Fetches and installs the manifest, returning `None`. |
| `get_flags(group_name_or_id, fetch)` | Fetches `<group-id>.json`, validates against the installed manifest, and returns a `Group` model without installing it. |
| `set_flags(group)` | Validates and installs a `Group` model and its lookup tables, returning `None`. |
| `sync_flags(group_name_or_id, fetch)` | Fetches and installs a group, returning `None`. |
| `should(group_name_or_id, feature_name_or_id)` | Returns a boolean for a toggle, gradual, or selective feature using the configured instance ID. An inactive schedule returns `False`. |
| `should_custom(group_name_or_id, feature_name_or_id, custom_instance_id)` | Evaluates a boolean feature using a string, integer, or finite float instance ID for this call. |
| `value(group_name_or_id, feature_name_or_id, default_value)` | Returns an active value feature's string or number, or the supplied default when its schedule is inactive. |

The fetch callback receives a URL and must return the original JSON as text or bytes, not a decoded dictionary. For direct ingestion, import `Manifest` and `Group` from `vexilla_client.types`, parse raw JSON with `Manifest.parse_raw(raw)` / `Group.parse_raw(raw)`, then call the setters.

Callback exceptions become `FetchError` from `vexilla_client.client`. Invalid JSON or publication data raises parsing/validation errors. Missing groups, environments, or features raise lookup errors from `vexilla_client.exceptions`; invalid instance IDs raise `ValueError`. `should` on a value feature raises `InvalidShouldFeatureTypeError`, and `value` on a boolean feature raises `InvalidValueFeatureTypeError`. Defaults apply only to inactive value schedules, so lookup and kind errors still raise. Active zero and empty-string values are returned as stored. Failed validation leaves the previously installed snapshot intact.


## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types python REMOTE_JSON_URL
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
