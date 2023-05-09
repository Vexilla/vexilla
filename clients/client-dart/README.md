# Vexilla Client - Dart

This is the Dart client library for Vexilla, a static file based feature flag system.

## Getting Started

To get started is easy.

### Installation


Add the client pubspec.yaml.

```yaml
dependencies:
  vexilla_client: ^0.1.0
```

A version without null safety is also available:

```yaml
dependencies:
  vexilla_client: ^0.0.2
```


### Setup

You will need to create a Client within your app. This optionally takes in the `customInstanceHash` for use with gradual rollout.

After creation, call `fetchFlags`. This can be chained from the constructor since it returns the client instance.


```dart
var client = VexillaClient(
    'dev',
    'https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com',
    'b7e91cc5-ec76-4ec3-9c1c-075032a13a1a');

var flags = await client.fetchFlags('features.json');

client.setFlags(flags);
```


### Usage

Use the created client to check if a feature `should` be on.


```dart
var shouldGradual = client.should(FEATURE_NAME)
```


### Full Example


```dart
var client = VexillaClient(
    'dev',
    'https://BUCKET_NAME.s3-website-AWS_REGION.amazonaws.com',
    'b7e91cc5-ec76-4ec3-9c1c-075032a13a1a');

var flags = await client.fetchFlags('features.json');

client.setFlags(flags);

if (client.should('FEATURE_NAME')) {
  print('User should be able to use this feature.');
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

6. Finally your application uses the client you created to determine if a feature `should` be on.

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
