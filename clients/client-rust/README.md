# Vexilla Client - Rust

This is the Rust client library for Vexilla, a static file based feature flag system.

## Getting Started

To get started is easy.

### Installation

Add the client to your imports.

```rust
vexilla_client = "0.0.1"
```

### Setup

You will need to create a Client within your app. This optionally takes in the `custom_instance_hash` for use with gradual rollout.

After creation, call `fetch_flags_blocking`. This can be chained from the constructor since it returns the client instance.

```rust
let mut client = VexillaClient::new("dev", "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com", user_id);

let mut flags = client.fetch_flags_blocking("features.json");

client.set_flags(flags);
```

### Usage

Use the created client to check if a feature `Should` be on.

```rust
let should_gradual = client.should(FEATURE_NAME)
```

### Full Example

```rust
let mut client = VexillaClient::new("dev", "https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com", user_id);

let mut flags = client.fetch_flags_blocking("features.json");

client.set_flags(flags);

if client.should(FEATURE_NAME) {
  // Do the thing
}
```

## What are Feature Flags?

Feature flags are useful for enabling or disabling parts of your application without having to redeploy. In some cases such as mobile applications, the redeploy could take up to a week.

See more about them here:

- [https://featureflags.io](https://featureflags.io)
- [https://en.wikipedia.org/wiki/Feature_toggle](https://en.wikipedia.org/wiki/Feature_toggle)

Feature Flags are also a fundamental building block for things such as A/B testing.

## How does it work?

1. You configure the Config UI with your hosting credentials. These are stored in LocalStorage. Your credentials should have a limited scope of permissions.

2. You add environments to the Config UI.

3. Then you add features. These can be a toggle or a gradual rollout.

4. Then you upload the json to your static hosting provider. You can also download ot copy the JSON to your clipboard for other uses.

5. Your applications include a client library as a dependency and the client consumes the JSON config.

6. Finally your application uses the client you created to determine if a feature `Should` be on.

## Contributing

## Support

If you are having issues, please open a Github Issue on the relevant repo. (client, app, docs, etc.).

## Sponsors

No sponsors yet. This could be a link and icon for **your** company here.

## LICENSE - MIT

Copyright 2021 Vexilla

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
