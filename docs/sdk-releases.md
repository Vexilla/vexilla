# SDK releases

Maintainers approve stable SDK publication by reviewing and merging a Release Please PR. There is no automatic PR merge or second routine environment approval. The merged PR creates a component tag and GitHub Release, then directly calls verification and publication in the same Actions run. A GitHub Release records intent; the Actions summary records the registry outcome.

JS and internal contract types share a release PR/version. Elixir and Rust have separate PRs and independent versions. Only `@vexilla/client` (npm), `vexilla_client` (Hex), and `vexilla_client` (crates.io) publish. `@vexilla/types` remains internal. Publication-disabled SDKs still participate in the required ten-SDK contract gate.

## Current rollout state

**Automation is intentionally gated.** The inventory selects three publishers, but `automation.enabled` is false and the baseline manifest is unseeded. Neither release PR creation nor publication may start until `node scripts/releases/check-release-config.cjs --require-ready` passes and repository variable `SDK_RELEASES_ENABLED` is `true`.

Public registry observations are evidence, not proof of account authorization or source correspondence. npm is at 1.0.3, Hex at 1.0.1, and crates.io at 1.0.0 while the local Rust manifest says 1.0.1. Reconcile the unpublished Rust version before seeding release history. See [the inventory](../.github/sdk-release-inventory.json), [release baseline notes](sdk-release-baselines.md), and [native packaging](sdk-native-packaging.md).

The JS SDK uses schema-derived public models named `VexillaFeature`, `VexillaSchedule`, `VexillaManifest`, `VexillaGroup`, and `VexillaEnvironment`. Internal `Published*` names stay internal, apart from deprecated historical `PublishedGroup` and `PublishedEnvironment` compatibility exports. Ordinary annotations now require numeric schedule boundaries and `version: "v1"`; SDK environments no longer require editor defaults. Protected subclass declarations are stricter too. These changes require migration from 1.0.3: the first automated JS/types release must be at least **2.0.0**, with maintainer compatibility review recorded in the inventory. No manifest versions have been bumped here. See [the compatibility evidence](../clients/js/test/package-consumer/README.md).

The maintainer confirmed BUSL-1.1 for the JS SDK. Its npm license identifier and bundled LICENSE now match the repository license, including its existing parameters; the inventory records that decision. Historical npm 1.0.3 license observations remain in the baseline evidence.

The first hosted verification and first generated release PRs require these changes on GitHub. Local fixture and package checks do not substitute for the hosted ten-language receipts.

## Maintainer and contributor workflow

Use a Conventional Commit PR title, then squash merge so that title becomes the commit subject:

- `fix(js): handle ...` requests a patch for affected release paths.
- `feat(rust): support ...` requests a minor.
- `feat(types)!: change ...` requests a major for both JS and types.
- `docs: ...` and ordinary `chore: ...` do not independently request a release.

Use `!` in the title for a breaking change. A `BREAKING CHANGE:` footer in a PR description must be copied into the squash commit body; a PR description is not itself a git commit. The title check enforces this convention. Enable squash merges in repository settings and use PR titles for default squash subjects. Do not squash away breaking markers.

Review each release PR's changelog, version, grouped components, package identity, and required checks. Later applicable commits update an open release PR. App/publishing-only changes do not request SDK versions. Do not use `Release-As`, prerelease versions, manually moved tags, or automatic release-PR merging.

## One-time setup and activation

1. Confirm current registry ownership with the account that will configure trust. Download the existing artifacts, identify their source commits, reconcile Rust 1.0.1 versus published 1.0.0, and choose a reviewed initial JS/types version consistent with the public type compatibility report. Do not treat unreleased local versions as published baselines.
2. Record each verified baseline and source revision in the inventory. Mark the JS declaration migration as a breaking Conventional Commit and retain it after the initial history boundary so the first linked release proposes 2.0.0 or later; a patch/minor proposal below that floor is rejected. Record `publicTypeCompatibilityReviewed` after review; `licenseConfirmed` is already true for the maintainer-approved BUSL-1.1 choice. Seed `.release-please-manifest.json` for all four managed components. Align `clients/js/package.json`, `packages/types/package.json`, and their manifest entries. Record a deliberate full commit SHA in `automation.historyBoundary` and `release-please-config.json`'s `bootstrap-sha`; only subsequent changes count as unreleased work.
3. Create a repository-scoped GitHub App, install it only where needed, grant Contents and Pull requests read/write, and configure `SDK_RELEASE_APP_ID`, secret `SDK_RELEASE_APP_PRIVATE_KEY`, and `SDK_RELEASE_BOT_LOGIN` (the exact `app-slug[bot]` login). The App token creates release PRs so normal PR checks run. There is no silent `GITHUB_TOKEN` fallback. Require the SDK contract gate, release automation fixtures, and SDK PR-title check under the repository's branch rules. Verify a bot-created PR actually receives required checks and can be reviewed normally.
4. Create environments `sdk-npm`, `sdk-hex`, and `sdk-crates`. Restrict deployment to `main`; do not configure required reviewers or wait timers for this flow. The release PR merge is the approval. Restrict workflow-dispatch use and protect the release workflow/inventory through normal review.
5. Configure each registry's trusted publisher for repository **Vexilla/vexilla**, calling workflow **sdk-release.yml**, and its exact environment. Although upload steps live in reusable `sdk-publish.yml`, trust must match the caller. Verification jobs have no `id-token: write` and receive no registry secrets. Only the final publisher job obtains OIDC credentials.
6. On npm configure package `@vexilla/client`, environment `sdk-npm`, and permission for direct `npm publish`. Recent npm configurations default to staging; staging would require another approval and is not this flow. Use GitHub-hosted runners and npm >=11.5.1 (Node 24). The npm package `repository.url` must match the GitHub repository. Do not provide `NODE_AUTH_TOKEN`, `NPM_TOKEN`, or a writable npmrc token.
7. On Hex configure existing public package `vexilla_client` with workload identity, calling workflow and `sdk-hex`. A public GitHub repository requires the environment. Establishing package existence/ownership or a first publication is a separate maintainer bootstrap operation. On crates.io configure existing crate `vexilla_client` with trusted publishing and `sdk-crates`; the official auth action obtains the temporary token.
8. Run local checks below and the complete hosted SDK contract plus native package/consumer jobs at the proposed revision. Record their run URL and receipts. Set inventory `automation.enabled` true only after its prerequisites are verified, then set `SDK_RELEASES_ENABLED=true`. Inspect the first generated release PR for each group before merging it. Confirm package versions increase appropriately; especially inspect a types-only breaking change affecting JS.

The pinned Release Please npm dependency and lockfile live under `scripts/releases`; fixture tests and production orchestration use that same published build. Upgrading it requires the grouping fixtures to pass.

Official setup references: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers), [Hex workload identity](https://hex.pm/docs/workload-identity), [crates.io trusted publishing](https://doc.rust-lang.org/cargo/reference/registry-authentication.html), and [GitHub App tokens](https://github.com/actions/create-github-app-token).

## Verification and artifact identity

`sdk-publish.yml` resolves the tag to a full commit, checks its stable GitHub Release, exact configured bot author, tagged release-PR label, component manifest change, maintainer merge, and membership in `main`. Tag, package, manifest, and release version must agree. JS/types manifest versions must agree too. Every contract checkout uses that SHA. Missing, failed, skipped, duplicate, stale, or mismatched receipts fail the gate; disabling registry publication never removes a consumer.

Native tests run with the checked-out fixture server. Clean consumers load the packed npm, Hex, or Cargo artifact without sibling workspace source. `candidate.json` records package, version, tag, commit, PR, verification status, and file SHA256 digests. Native receipts also record registry checksums. Verification produces one candidate artifact per SDK/tag, retained for 90 days. Publisher jobs download and recheck those bytes and revalidate release approval before obtaining registry credentials. npm uploads the verified tarball; native publishers upload verified archives directly.

Automatic and recovery runs serialize per SDK/tag without cancelling uploads. Matrix `fail-fast: false` lets unrelated registries finish after an individual failure. Summaries report approval, contracts, packaging, and publication independently.

## Recover a failed publication

Open Actions → **SDK releases** → **Run workflow** on `main`. Select `js`, `elixir`, or `rust` and supply the exact existing stable tag, such as `client-rust-v1.0.2`. Recovery creates no new version, release, or tag and accepts no arbitrary branch, commit, prerelease, or disabled SDK.

Every recovery rebuilds and reverifies the exact approved commit; this also handles expired candidate artifacts. It does not assume old artifact retention proves verification. Rebuilding may reproduce different bytes for an existing version; in that case integrity comparison fails and requires inspection, never a blind skip or overwrite. Preserve original artifacts if byte-for-byte comparison is needed.

Registry lookups distinguish HTTP 404 absence from authentication, network, rate-limit, and service failures. An existing version succeeds only if authoritative integrity matches the candidate. A successful upload followed by a lost response is reconciled using the same evidence. A conflicting/unverifiable version fails visibly. Hex retries an outstanding documentation upload for the same version after verifying the package checksum; it does not upload the immutable package again. Missing OIDC trust has no long-lived-token fallback.

## Local checks and stopping automation

```sh
npm ci --ignore-scripts --prefix scripts/releases
node scripts/releases/check-release-config.cjs
node --test scripts/releases/*.test.cjs
pnpm contract:generate
pnpm contract:test:producer
pnpm contract:test:gate
```

These checks make no registry writes. `--require-ready` is expected to fail while rollout prerequisites remain unresolved. CI also verifies workflow syntax; a maintainer can run `actionlint .github/workflows/sdk-*.yml .github/workflows/contract.yml` locally.

Set `SDK_RELEASES_ENABLED=false` to stop release generation/publication, or set inventory automation/publisher enablement false in a reviewed change. Disable the workflow to stop dispatch entirely. Cancel an in-progress run deliberately if required; do not interrupt a registry upload without reconciling its outcome. Do not unpublish or move release tags to repair a failure. Fix published behavior through a new reviewed version.

## Enable another SDK

The inventory contains dormant native definitions and specific prerequisites for Go, Python, PHP, Swift, Kotlin, C#, and OCaml. Lua and Dart are omitted. Flipping `enabled` alone fails configuration validation: each activation also needs native versioning configuration, verified registry/source history, package/isolated-consumer checks, approval/tag validation, trusted registry authentication, integrity reconciliation, and recovery fixtures. Go needs directory-prefixed module tags; Python needs distribution metadata; PHP needs a monorepo distribution strategy; Swift needs a SwiftPM/CocoaPods decision; Kotlin needs coordinates/signing; C# needs normalized identity/versioning; OCaml needs an immutable archive/opam strategy that respects generated metadata.
