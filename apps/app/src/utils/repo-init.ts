export const README_CONTENTS = `
# Vexilla-based Feature Flags

This repo is the source of truth for feature flags to be used with [Vexilla](https://vexilla.dev).

You can modify these flags through the [application](https://app.vexilla.dev/).

Please note that this repository is automatically updated with the latest flags from Vexilla rather than updated manually.

## Deployment

Vexilla does not prescribe how you ship the flags to where you want to actually host them. You can host these flags on S3/Cloudfront or any other public CDN. You can also host them on an internal static file server. As long as Vexilla SDKs can fetch the flags from your user's network, they can consume these flags.

<!-- INCLUDE INFO ABOUT DEPLOYMENT AND GITHUB ACTIONS OR OTHER PROVIDERS  -->

`;
