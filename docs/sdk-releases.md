# SDK releases

Maintainers approve stable publication by reviewing and merging a Release Please PR. The merged PR creates a component tag and GitHub Release, then runs fresh verification and publication in the same Actions run. Registry outcomes remain independent. There is no automatic PR merge or second routine environment approval.

## Current state

Inventory schema 2 separates `release.managed` (release PRs, version manifest, tags and GitHub Releases) from `publish.enabled` (registry candidates and recovery). Publication requires management. The implemented routes remain JS/npm, Elixir/Hex and Rust/crates.io. Internal types join and leave management with JS, have the exact same version, and never publish. All eleven contract consumers remain required regardless of publication switches.

JS, private types and Rust are release-managed and their 2.0.0 version updates have merged. Elixir adoption/generation was accepted through PR #76, and its generated 2.0.0 release PR #77 passed its checks. This reviewed policy enables JS/npm, Rust/crates.io and Elixir/Hex publication after accepted adoption, ownership/trust, preflight and release PR checks. The fixed history boundary remains `8b4d80c05abec38d953f38b6bf59ff96462939fa`. Repository variable `SDK_RELEASES_ENABLED` must be `true` for execution. Private types never publish. See the dated [Hex publisher-activation record](sdk-release-adoption.md#hex-publisher-activation-2026-11-06).

The common release line is `versionPolicy.major: 2`. Every prospective version must be stable and use exactly that major. JS/types, Rust and later Elixir initially target exactly **2.0.0** from explicit 1.x management seeds. This is independent of registry baselines. A breaking adoption input after the fixed history boundary drives the pinned generator; a minimum floor alone cannot generate 2.0.0. After the approved version update reaches the target, later patches propose 2.0.1 and independent minor releases are allowed. No `Release-As` overrides, prereleases or build metadata are supported.

See [adoption review and activation checklist](sdk-release-adoption.md), [baseline evidence](sdk-release-baselines.md), [native packaging](sdk-native-packaging.md), and [JS migration evidence](../clients/js/test/package-consumer/README.md).

## GitHub configuration

| Kind                | Name                          | Value or purpose                                                                                    |
| ------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Repository variable | `SDK_RELEASES_ENABLED`        | Exact string `true` permits release execution; `false` stops new runs |
| Repository variable | `SDK_RELEASE_APP_ID`          | Release GitHub App ID                                                                               |
| Repository variable | `SDK_RELEASE_BOT_LOGIN`       | Exact `app-slug[bot]` login for that App                                                            |
| Repository secret   | `SDK_RELEASE_APP_PRIVATE_KEY` | App PEM private key                                                                                 |
| Environment         | `sdk-npm`                     | npm trusted publisher for `@vexilla/client`                                                         |
| Environment         | `sdk-crates`                  | crates.io trusted publisher for `vexilla_client`                                                    |
| Environment         | `sdk-hex`                     | Hex workload identity for `vexilla_client`; branch `main` only                                      |

Reinspection on 2026-11-02 confirmed repository variables `SDK_RELEASE_APP_ID`, `SDK_RELEASE_BOT_LOGIN`, and `SDK_RELEASES_ENABLED`, with the stop switch set to `false`. The App ID is numeric and the bot login has the expected `app-slug[bot]` format. Only `SDK_RELEASE_APP_PRIVATE_KEY` remains a repository secret; no secret contents were read. This resolved the variable-location issue; subsequent generation created checked App-authored release PRs #72 and #73. Both `sdk-npm` and `sdk-crates` now allow only branch `main`. The active `Protect main` ruleset requires PRs and the three release/contract/title checks, with zero required approvals so the primary contributor can merge human-authored PRs after CI passes. The repository permits squash merges and uses PR titles as squash subjects.

Install a repository-scoped GitHub App with Contents and Pull requests read/write. The App creates release PRs so normal checks run; there is no silent `GITHUB_TOKEN` fallback. Verify the configured login matches the App token action's slug. The App subsequently generated the JS/types and Rust release PRs and their contract checks passed. Direct installation-endpoint inspection still requires App JWT authentication; the earlier read-only HTTP 401 was not a registry authentication result.

Restrict publisher environments to `main`, protect workflow/inventory changes through review, and configure required PR checks for the SDK contract gate, release fixtures and SDK PR-title check. Obtain actual check names from a hosted PR before configuring the rule. Do not require the push-only `SDK release policy outcomes` diagnostic on PRs: it runs after release orchestration on main. It must succeed in the release run; valid unrelated candidates continue even if that diagnostic fails.

Registry trust must name repository **Vexilla/vexilla**, calling workflow **sdk-release.yml**, and the exact environment above. Upload code lives in reusable `sdk-publish.yml`; trust names the caller. Only the final publisher requests `id-token: write`. Configure npm to allow direct `npm publish`, since staging would add an approval step. A newly created npm trust configuration must complete its first publication within two days; otherwise it expires and must be recreated. Check this account-side state shortly before the first approved publication. An authentication failure is not a reason to introduce a token fallback. npm **12.2.1** is pinned and install/pack commands explicitly suppress lifecycle scripts. Initial package setup selects Node 24.16.0; the nested test-server action subsequently resolves Node 24, so the actual package toolchain is recorded in evidence (24.22.0 for JS and 24.22.1 for Rust in the verified preflight). No `NODE_AUTH_TOKEN`, `NPM_TOKEN`, stored Hex API key, or long-lived crates.io token is needed.

Official references: [GitHub App tokens](https://github.com/actions/create-github-app-token), [npm trusted publishers](https://docs.npmjs.com/trusted-publishers), [npm 12 install policy](https://docs.npmjs.com/cli/v12/commands/npm-install/), [Hex workload identity](https://hex.pm/docs/workload-identity), and [crates.io trusted publishing](https://crates.io/docs/trusted-publishing).

## Preflight before activation

After these changes are deployed, open Actions → **SDK credential-free preflight** (`sdk-preflight.yml`), enter a full 40-character commit SHA, and select `js,rust` (or any explicit supported subset, including Elixir). It runs the complete eleven-SDK contract workflow and the same selected SDK tests, package inspection, isolated consumers and Elixir docs checks used before publication. It requests read-only contents permission and has no publisher environment, registry secrets, release writes or OIDC identity permission.

The `sdk-preflight-evidence` artifact records `kind: sdk-preflight`, `publicationAuthorized: false`, source SHA, hosted run URL/attempt, toolchain versions, all contract receipts, package/consumer receipts and file digests. The verifier rejects incomplete, stale, failed or changed evidence. Artifacts use distinct `sdk-preflight-*` names. A successful preflight is readiness evidence; it cannot authorize an upload or supply an approved release candidate.

Hosted preflight [run 41549688344](https://github.com/Vexilla/vexilla/actions/runs/41549688344), attempt 1, succeeded at merged source `136a8091bbb582b29f1386818883dfa6177c1a0b`. All eleven contract/native consumers, the required gate, JS/Rust package consumers and final evidence passed. Downloaded receipts and package bytes were independently revalidated against [the retained evidence](release-evidence/sdk-preflight-41549688344.json). This readiness record does not establish registry authentication or authorize publication.

## Adopt and activate in stages

1. The maintainer-approved JS/Rust source/history adoption, generation policy, publisher activation and 2.0.0 release PRs have merged. Their package versions and registry outcomes remain independent. [The adoption record](sdk-release-adoption.md) preserves the historical seeds and decisions.
2. Keep shared boundary `8b4d80c05abec38d953f38b6bf59ff96462939fa` in both `automation.historyBoundary` and `bootstrap-sha`. Elixir retains its unconsumed breaking input and truthful 1.0.1 seed; no native manifest is manually bumped to 2.0.0 by activation.
3. Hex workload identity setup is maintainer-confirmed and the `sdk-hex` environment permits only `main`. Complete Elixir's credential-free preflight, including all eleven SDK contracts and its package, production and docs consumers.
4. PR #76 accepted the Elixir source/history scope at `5a98e333e80ed5a88a76984514081e8cebd0fa32` and generated release PR #77. Its native version, changelog and management manifest propose exactly 2.0.0, and its required checks passed.
5. Merge this separate Hex publisher-activation configuration before release PR #77. Let the App refresh #77 against main, wait for its required checks, then deliberately merge #77. Keep repository variable `SDK_RELEASES_ENABLED=true` for execution. Enabling a publisher scans no historical backlog.
6. Inspect the final release's fresh contract/package/docs, current-policy and OIDC results, then verify the public Hex archive checksum and HexDocs contents. Recover only the same approved tag if publication fails; never move tags or invent a new version to retry.

## Contributor release inputs

Use Conventional Commit PR titles and squash merge: `fix(js): ...` requests a patch, `feat(rust): ...` requests a minor, and `feat(types)!: ...` requests a linked breaking release. Keep `!` in the squash subject. Breaking changes proposing 3.x fail visibly until a reviewed coordinated major transition changes policy for every managed group; they are never silently reclassified as minor. Ordinary docs/chore commits do not request releases.

The JS client bundles `packages/publishing/src/validation.ts`, so that file is a JS release input. Shared editor/app changes are not. Group-scoped history processing prevents an invalid JS override from poisoning unrelated native proposals. Each group's failures are emitted as structured diagnostics into `SDK release policy outcomes`; created valid candidates still reach their independent verification path. Configuration-wide corruption fails before mutations.

Release Please is pinned to npm package 17.11.2 and its integrity in the locked release-tool installation. Snapshot reads and PR base creation use the exact workflow revision. A concurrent main push defers stale PR maintenance without losing already-created candidates or overwriting newer files.

## Current policy and immutable recovery

The current reviewed main inventory authorizes management, publisher enablement and the exact major. Tagged source provides package identity, manifests, tag, approved PR and immutable package bytes. Evidence records both `policyRevision` and `sourceRevision`. Verification tools are checked out separately from historical package source. Disabling current policy stops old enabled tags; enabling current policy permits deliberate recovery of an old publication-disabled tag. A current-policy lookup failure refuses publication before credentials.

Recovery is Actions → **SDK releases** on main, selecting one supported SDK and its exact existing stable component tag (for example `client-rust-v2.0.0`). It creates no version, tag or GitHub Release. The generation job is intentionally skipped; the publisher explicitly accepts that skipped ancestor while requiring successful candidate selection, a nonempty candidate matrix and an uncancelled run. It rechecks bot authorship, maintainer merge, ancestry, source/version-manifest equality, contracts and package/consumer verification. Enabling a publisher never scans or replays its backlog. Recovery of an older major after a policy transition is rejected and needs a separately reviewed maintenance policy.

For npm `ENEEDAUTH`, the final error includes the npm/Node versions, the observed OIDC stage and the npm exchange HTTP status when available. npm can hide a token-exchange rejection behind this generic authentication error. Diagnostics use fixed labels; raw npm debug logs, response bodies, issuer URLs and credentials are never printed or uploaded, and the temporary logs are deleted. Check the saved trusted publisher's exact repository, calling workflow, environment, direct-publish permission and first-use expiry against the configuration above. After merging a publisher-tool correction, start a fresh recovery on main for `js` and `client-js-v2.0.0`; retrying only an old failed job may retain its earlier policy/tool revision. Keep the existing release tag and package version.

Final jobs recheck current-main stop controls immediately before credential acquisition; publishers reauthorize again before uploads. The repository variable is a workflow context snapshot, not a fresh REST variable read. To stop an already-running job, commit current-main `automation.enabled: false` or the affected `publish.enabled: false`, and deliberately cancel outstanding runs when necessary. `SDK_RELEASES_ENABLED=false` stops new runs; GitHub's variable REST API requires separate Variables permission, which the publication token does not request.

Publishers verify candidate digests and upload exactly those bytes. Only HTTP 404 means a registry version is absent. Lookup/authentication/network failures fail, and existing versions succeed only when authoritative integrity matches. Lost responses are reconciled by those same digests. Recovery never overwrites packages, moves tags, yanks versions or silently bumps a version. Hex docs can recover independently after the immutable package matches.

npm can accept an upload before the version is publicly visible. After one upload attempt, the publisher waits up to five minutes while the exact version returns HTTP 404, then requires the same authoritative integrity match. It does not repeat the upload during that wait. Conflicting bytes and other lookup failures fail immediately. If visibility times out, inspect npm's processing status and the public registry before recovering the same approved tag.

## Future Elixir and major transitions

Hex workload identity setup, the main-only `sdk-hex` environment, adoption through PR #76, credential-free preflight and generated release PR #77 checks are recorded. The separate publisher policy enables the Hex route; merge it before deliberately approving the release through #77. The existing seed and shared boundary stay unchanged. Staged Publishing would require explicit approval/reconciliation support in the native publisher; the current route expects direct public release and docs visibility. No stored Hex API key is needed.

For major 3, review migration notes and transition inputs for all managed groups, update `versionPolicy.major` and their first-transition targets/seeds together, and verify each actual proposal is 3.0.0. Registry uploads remain sequential and independent. If Elixir is still inactive on a truthful 1.x seed, its stale 2.0.0 target does not block other groups; simply flipping management or relabeling its target 3.0.0 fails. A revised reviewed adoption mechanism must prove generation of the then-current major without inventing an intervening 2.0.0 release.

Other SDK routes remain dormant. Go needs directory-prefixed module tags and proxy consumption; Python distribution metadata; PHP a monorepo distribution strategy; Swift a package/repository decision; Kotlin coordinates/signing; C# normalized identity/versioning; OCaml an immutable archive/opam strategy. Flags cannot enable an unimplemented route. Lua and Dart have no publishing route here.

## Local validation

```sh
npm ci --ignore-scripts --prefix scripts/releases
node scripts/releases/check-release-config.cjs
node --test scripts/releases/*.test.cjs
pnpm contract:generate
pnpm contract:test:producer
pnpm contract:test:gate
actionlint .github/workflows/sdk-*.yml .github/workflows/contract.yml
```

These checks make no registry writes. `check-release-config.cjs --require-ready` validates generation-policy readiness; repository variable `SDK_RELEASES_ENABLED` separately authorizes execution. Generation-only readiness can pass with no publishers enabled. The publisher selectors still reject automatic candidates and recovery until their per-SDK flags and evidence are accepted. Stop switches never undo existing approved registry history.
