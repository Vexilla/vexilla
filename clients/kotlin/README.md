# Vexilla Client - Kotlin

This is the Kotlin client library for Vexilla, a static file-based VCS-native feature flag system.

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


The Kotlin Vexilla client currently relies upon Kotlin 1.9.x.

### Groovy

Kotlin DSL:
```kotlin
repositories {
  mavenCentral()
}

dependencies {
  implementation 'dev.vexilla.client:1.0.0'
}
```

Groovy DSL:
```groovy
repositories {
  mavenCentral()
}

dependencies {
  implementation 'dev.vexilla.client:1.0.0'
}
```



### Setup

You will need to create a Client within your app. This optionally takes in the `instanceId` for use with gradual rollout as well as Selective features.

After creation, call `syncFlags`. This can be chained from the constructor since it returns the client instance.

**Important Note**: All methods that make HTTP requests take in a callback for the request itself. This allows you to use your existing dependencies or standard library methods to keep this bundle smaller and less opinionated.

```kotlin
val httpClient = HttpClient(CIO)

val serverHost = "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com"
val uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
val environment = "dev"

val vexillaClient = Client(serverHost, environment, uuid)

runBlocking {
    vexillaClient.syncManifest { url ->
        // return RAW text to be parsed under the hood by the client
        httpClient.get(url).bodyAsText(Charset.defaultCharset())
    }

    vexillaClient.syncFlags(GROUP_NAME_OR_ID) { url ->
        // return RAW text to be parsed under the hood by the client
        httpClient.get(url).bodyAsText(Charset.defaultCharset())
    }
}
```


### Usage

Use the created client to check if a feature `should` be on.

```kotlin
val shouldShowFeature = vexillaClient.should(GROUP_NAME_OR_ID, FEATURE_NAME_OR_ID)
```


### Full Example

```kotlin
val httpClient = HttpClient(CIO)

val serverHost = "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com"
val uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
val environment = "dev"

val vexillaClient = Client(serverHost, environment, uuid)

runBlocking {
    vexillaClient.syncManifest { url ->
        // return RAW text to be parsed under the hood by the client
        httpClient.get(url).bodyAsText(Charset.defaultCharset())
    }

    vexillaClient.syncFlags(GROUP_NAME_OR_ID) { url ->
        // return RAW text to be parsed under the hood by the client
        httpClient.get(url).bodyAsText(Charset.defaultCharset())
    }
}

val shouldShowFeature = vexillaClient.should(GROUP_NAME_OR_ID, FEATURE_NAME_OR_ID)

if (shouldShowFeature) {
    // Show the feature
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


### `fun Client(value: Boolean?): Client`

Returns a new instance of the Vexilla client

#### Arguments

- baseUrl `String`: The name or ID of the environment you are targeting. This will be used in the lookups of flags and their config.

- environment `String`: The base URL where your JSON files are stored. When fetching flags Vexilla will append the coerced file name to the url. No trailing slash.

- instanceId `String`: The ID, often for a user, to use by default for determining gradual flags and selective flags.

### `suspend fun getManifest(fetch: suspend (url: String) -> String): Manifest`

Fetches the manifest file for facilitating name->id lookups. Does not set the value on the client. You would need to call `set_manifest` after. Alternatively, you can use `sync_manifest` to do both steps with less code.

#### Arguments

- fetch `suspend (url: String) -> String`: A callback that is passed the url of the manifest file. You can bring your own http request library.

### `fun setManifest(manifest: Manifest): void`

Sets a fetched manifest within the Client instance.

#### Arguments

- manifest `Manifest`: The manifest file to persist into the client. Usually fetched via `getManifest`.

### `suspend fun syncManifest(fetch: suspend (url: String) -> String): void`

Fetches and sets the manifest within the client to facilitate name->Id lookups.

#### Arguments

- fetch `suspend (url: String) -> String`: A callback that is passed the url of the manifest file. You can bring your own http request library.

### `suspend fun getFlags(groupNameOrId: String, fetch: suspend (url: String) -> String): Group`

Fetches the flags for a specific flag_group. Can use the ID or the name of the group for the lookup.

#### Arguments

- groupNameOrId `String`: The Name or ID of the flag group you would like to fetch.

- fetch `suspend (url: String) -> String`: A callback that is passed the url of the flag group file. You can bring your own http request library.

### `fun setFlags(groupNameOrId: String, group: Group): void`

Sets a fetched flag group within the Client instance.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to set.

- group `Group`: The collection of flags you would like to set. Typically from a `getFlags` call. `syncFlags` wraps both functions to streamline the process.

### `suspend fun syncFlags(groupNameOrId: String, fetch: suspend (url: String) -> String): void`

Fetches and sets the flag group within the client to facilitate name->Id lookups.

#### Arguments

- groupNameOrId `String`: The Name or ID of the flag group you would like to fetch.

- fetch `suspend (url: String) -> String`: A callback that is passed the url of the flag group file. You can bring your own http request library.

### `fun should(groupNameOrId: String, featureNameOrId: String, instanceId: String = this.instanceId): Boolean`

Checks if a toggle, gradual, or selective flag should be enabled. Other methods exist for other flag types, such as value.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- instanceId (optional) `String`: An instance ID other than the one defined on the Client. This can be useful for checking against a user's group/team/etc rather than their individual id.

### `fun shouldCustomInt(groupNameOrId: String, featureNameOrId: String, instanceId: Int): Boolean`

Similar to the `should` method, but allows passing a custom integer for the instanceId. This can be especially useful for Selective flags that target groups instead of individual user IDs.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- instanceId `Int`: An instance ID other than the one defined on the Client. This can be useful for checking against a user's group/team/etc rather than their individual id.

### `fun shouldCustomLong(groupNameOrId: String, featureNameOrId: String, instanceId: Long): Boolean`

Similar to the `should` method, but allows passing a custom integer for the instanceId. This can be especially useful for Selective flags that target groups instead of individual user IDs.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- instanceId `Long`: An instance ID other than the one defined on the Client. This can be useful for checking against a user's group/team/etc rather than their individual id.

### `fun shouldCustomFloat(groupNameOrId: String, featureNameOrId: String, instanceId: Float): Boolean`

Similar to the `should` method, but allows passing a custom float for use in the same way `instanceId` is used from the contructor. This can be especially useful for Selective flags that target groups instead of individual user IDs.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- instanceId `Float`: An instance ID other than the one defined on the Client. This can be useful for checking against a user's group/team/etc rather than their individual id.

### `fun shouldCustomDouble(groupNameOrId: String, featureNameOrId: String, instanceId: Double): Boolean`

Similar to the `should` method, but allows passing a custom float for use in the same way `instanceId` is used from the contructor. This can be especially useful for Selective flags that target groups instead of individual user IDs.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- instanceId `Double`: An instance ID other than the one defined on the Client. This can be useful for checking against a user's group/team/etc rather than their individual id.

### `fun valueString(groupNameOrId: String, featureNameOrId: String, default: String): String`

Gets a string value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- default `String`: The default string value if the flag is off via scheduling or cannot be fetched.

### `fun valueInt(groupNameOrId: String, featureNameOrId: String, default: Int): Int`

Gets an integer value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- default `Int`: The default integer value if the flag is off via scheduling or cannot be fetched.

### `fun valueLong(groupNameOrId: String, featureNameOrId: String, default: Long): Long`

Gets a long value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- default `Long`: The default long value if the flag is off via scheduling or cannot be fetched.

### `fun valueFloat(groupNameOrId: String, featureNameOrId: String, default: Float): Float`

Gets a float value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- default `Float`: The default float value if the flag is off via scheduling or cannot be fetched.

### `fun valueDouble(groupNameOrId: String, featureNameOrId: String, default: Double): Double`

Gets a double value based on environment. Can be useful for things like pricing and subscription plans.

#### Arguments

- groupNameOrId `String`: The ID or name of the flag group that you would like to check.

- featureNameOrId `String`: The ID or name of the feature flag that you would like to check.

- default `Double`: The default double value if the flag is off via scheduling or cannot be fetched.



## Generate Types (Optional)

We have created a tool to generate types for usage in your code. It will crawl your JSON structures and create consts or enums to help prevent typos and other "magic string" related issues. You just need to pass the URL of the JSON file where it is hosted.

### NPM

To use the tool, you can run it directly from NPM.

```
npx vexilla types kotlin REMOTE_JSON_URL
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
