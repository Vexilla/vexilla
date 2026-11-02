# SDK releases

Maintainers approve stable publication by reviewing and merging a Release Please PR. The merged PR creates a component tag and GitHub Release, then runs fresh verification and publication in the same Actions run. Registry outcomes remain independent. There is no automatic PR merge or second routine environment approval.

## Current state

Inventory schema 2 separates `release.managed` (release PRs, version manifest, tags and GitHub Releases) from `publish.enabled` (registry candidates and recovery). Publication requires management. The implemented routes remain JS/npm, Elixir/Hex and Rust/crates.io. Internal types join and leave management with JS, have the exact same version, and never publish. All eleven contract consumers remain required regardless of publication switches.

All SDKs currently remain unmanaged and publication-disabled; `automation.enabled` is false, the management manifest is empty, and there is no accepted history boundary. JS and private types are aligned at the truthful pre-major seed 1.0.3. Rust retains unpublished local 1.0.1 against registry 1.0.0. This prepares independent JS/Rust adoption without asserting acceptance of unresolved evidence. Elixir stays inactive while Hex workload identity access is unresolved.

The common release line is `versionPolicy.major: 2`. Every prospective version must be stable and use exactly that major. JS/types, Rust and later Elixir initially target exactly **2.0.0** from explicit 1.x management seeds. This is independent of registry baselines. A breaking adoption input after the fixed history boundary drives the pinned generator; a minimum floor alone cannot generate 2.0.0. After the approved version update reaches the target, later patches propose 2.0.1 and independent minor releases are allowed. No `Release-As` overrides, prereleases or build metadata are supported.

See [adoption review and activation checklist](sdk-release-adoption.md), [baseline evidence](sdk-release-baselines.md), [native packaging](sdk-native-packaging.md), and [JS migration evidence](../clients/js/test/package-consumer/README.md).

## GitHub configuration

| Kind                | Name                          | Value or purpose                                                                                    |
| ------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Repository variable | `SDK_RELEASES_ENABLED`        | Leave absent or `false` until separately approved activation; exact string `true` permits operation |
| Repository variable | `SDK_RELEASE_APP_ID`          | Release GitHub App ID                                                                               |
| Repository variable | `SDK_RELEASE_BOT_LOGIN`       | Exact `app-slug[bot]` login for that App                                                            |
| Repository secret   | `SDK_RELEASE_APP_PRIVATE_KEY` | App PEM private key                                                                                 |
| Environment         | `sdk-npm`                     | npm trusted publisher for `@vexilla/client`                                                         |
| Environment         | `sdk-crates`                  | crates.io trusted publisher for `vexilla_client`                                                    |
| Environment, later  | `sdk-hex`                     | Hex workload identity for `vexilla_client`                                                          |

Reinspection on 2026-11-02 confirmed repository variables `SDK_RELEASE_APP_ID`, `SDK_RELEASE_BOT_LOGIN`, and `SDK_RELEASES_ENABLED`, with the stop switch set to `false`. The App ID is numeric and the bot login has the expected `app-slug[bot]` format. Only `SDK_RELEASE_APP_PRIVATE_KEY` remains a repository secret; no secret contents were read. This resolves the variable-location issue, while App authentication remains unverified. The environments exist but lack deployment branch restrictions. There are no repository rulesets or classic protection for `main`. The repository permits squash merges and uses PR titles as squash subjects.

Install a repository-scoped GitHub App with Contents and Pull requests read/write. The App creates release PRs so normal checks run; there is no silent `GITHUB_TOKEN` fallback. Verify the configured login matches the App token action's slug. App installation/authentication was not independently verified: the installation endpoint requires App JWT authentication, and the read-only session received HTTP 401.

Restrict publisher environments to `main`, protect workflow/inventory changes through review, and configure required PR checks for the SDK contract gate, release fixtures and SDK PR-title check. Obtain actual check names from a hosted PR before configuring the rule. Do not require the push-only `SDK release policy outcomes` diagnostic on PRs: it runs after release orchestration on main. It must succeed in the release run; valid unrelated candidates continue even if that diagnostic fails.

Registry trust must name repository **Vexilla/vexilla**, calling workflow **sdk-release.yml**, and the exact environment above. Upload code lives in reusable `sdk-publish.yml`; trust names the caller. Only the final publisher requests `id-token: write`. Configure npm to allow direct `npm publish`, since staging would add an approval step. A newly created npm trust configuration must complete its first publication within two days; otherwise it expires and must be recreated. Check this account-side state shortly before the first approved publication. An authentication failure is not a reason to introduce a token fallback. Node 24.16.0 and npm **12.2.1** are pinned in package/final-publish checks, and install/pack commands explicitly suppress lifecycle scripts. No `NODE_AUTH_TOKEN`, `NPM_TOKEN`, stored Hex API key, or long-lived crates.io token is needed.

Official references: [GitHub App tokens](https://github.com/actions/create-github-app-token), [npm trusted publishers](https://docs.npmjs.com/trusted-publishers), [npm 12 install policy](https://docs.npmjs.com/cli/v12/commands/npm-install/), [Hex workload identity](https://hex.pm/docs/workload-identity), and [crates.io trusted publishing](https://crates.io/docs/trusted-publishing).

## Preflight before activation

After these changes are deployed, open Actions → **SDK credential-free preflight** (`sdk-preflight.yml`), enter a full 40-character commit SHA, and select `js,rust` (or any explicit supported subset, including Elixir). It runs the complete eleven-SDK contract workflow and the same selected SDK tests, package inspection, isolated consumers and Elixir docs checks used before publication. It requests read-only contents permission and has no publisher environment, registry secrets, release writes or OIDC identity permission.

The `sdk-preflight-evidence` artifact records `kind: sdk-preflight`, `publicationAuthorized: false`, source SHA, hosted run URL/attempt, toolchain versions, all contract receipts, package/consumer receipts and file digests. The verifier rejects incomplete, stale, failed or changed evidence. Artifacts use distinct `sdk-preflight-*` names. A successful preflight is readiness evidence; it cannot authorize an upload or supply an approved release candidate.

GitHub returned HTTP 404 for `sdk-preflight.yml` on main on 2026-11-02. This implementation exists locally and cannot have hosted evidence for its final immutable revision until it is committed and deployed. Local tests must not be described as the hosted eleven-language run.

## Adopt and activate in stages

1. Review the artifact/source comparison, npm historical-source uncertainty, JS public type migration, unpublished Rust 1.0.1, exact adoption source and shared ancestor boundary in [the adoption checklist](sdk-release-adoption.md). Record accepted evidence without inventing a historical source SHA. BUSL-1.1 intent is already maintainer-confirmed.
2. Prepare only evidence-ready groups for management. JS/types enter together at 1.0.3; Rust starts at unpublished 1.0.1; each records `firstReleaseTarget: 2.0.0`. Managed inventory entries, Release Please packages/plugins and version-manifest membership must match exactly. Unmanaged Elixir needs none of their readiness assertions. Zero managed groups is valid and never invokes Release Please.
3. Record one fixed full ancestor SHA as `automation.historyBoundary` and `bootstrap-sha`. Retain reviewed breaking adoption inputs for each relevant SDK after it. Do not move the global boundary later to activate Elixir, consume its pending history early, seed 2.0.0 as already released, or fabricate tags. Verify the generated first proposals with the pinned Release Please 17.11.2.
4. Deploy and run credential-free preflight at the exact proposed adoption revision. Accept ownership and exact trust-configuration evidence separately from reported setup. Prior publication success is not required for a first publication; actual OIDC/authentication and registry outcomes remain unknown until the first approved run.
5. Separately authorize release-generation activation: inventory `automation.enabled: true` plus variable `SDK_RELEASES_ENABLED=true`, with publication still disabled. Verify real App-created PRs receive all required checks. Review the proposed 2.0.0 manifests, locks, changelogs and linked types.
6. Separately enable each evidence-ready publisher, then deliberately merge its first release PR. Require fresh final contracts/packages at the exact approved merge SHA. Inspect that run's approval, contract, package/consumer, final policy and registry results. An independently failing registry does not revoke another's outcome.

## Contributor release inputs

Use Conventional Commit PR titles and squash merge: `fix(js): ...` requests a patch, `feat(rust): ...` requests a minor, and `feat(types)!: ...` requests a linked breaking release. Keep `!` in the squash subject. Breaking changes proposing 3.x fail visibly until a reviewed coordinated major transition changes policy for every managed group; they are never silently reclassified as minor. Ordinary docs/chore commits do not request releases.

The JS client bundles `packages/publishing/src/validation.ts`, so that file is a JS release input. Shared editor/app changes are not. Group-scoped history processing prevents an invalid JS override from poisoning unrelated native proposals. Each group's failures are emitted as structured diagnostics into `SDK release policy outcomes`; created valid candidates still reach their independent verification path. Configuration-wide corruption fails before mutations.

Release Please is pinned to npm package 17.11.2 and its integrity in the locked release-tool installation. Snapshot reads and PR base creation use the exact workflow revision. A concurrent main push defers stale PR maintenance without losing already-created candidates or overwriting newer files.

## Current policy and immutable recovery

The current reviewed main inventory authorizes management, publisher enablement and the exact major. Tagged source provides package identity, manifests, tag, approved PR and immutable package bytes. Evidence records both `policyRevision` and `sourceRevision`. Verification tools are checked out separately from historical package source. Disabling current policy stops old enabled tags; enabling current policy permits deliberate recovery of an old publication-disabled tag. A current-policy lookup failure refuses publication before credentials.

Recovery is Actions → **SDK releases** on main, selecting one supported SDK and its exact existing stable component tag (for example `client-rust-v2.0.0`). It creates no version, tag or GitHub Release. It rechecks bot authorship, maintainer merge, ancestry, source/version-manifest equality, contracts and package/consumer verification. Enabling a publisher never scans or replays its backlog. Recovery of an older major after a policy transition is rejected and needs a separately reviewed maintenance policy.

Final jobs recheck current-main stop controls immediately before credential acquisition; publishers reauthorize again before uploads. The repository variable is a workflow context snapshot, not a fresh REST variable read. To stop an already-running job, commit current-main `automation.enabled: false` or the affected `publish.enabled: false`, and deliberately cancel outstanding runs when necessary. `SDK_RELEASES_ENABLED=false` stops new runs; GitHub's variable REST API requires separate Variables permission, which the publication token does not request.

Publishers verify candidate digests and upload exactly those bytes. Only HTTP 404 means a registry version is absent. Lookup/authentication/network failures fail, and existing versions succeed only when authoritative integrity matches. Lost responses are reconciled by those same digests. Recovery never overwrites packages, moves tags, yanks versions or silently bumps a version. Hex docs can recover independently after the immutable package matches.

## Future Elixir and major transitions

Resolve the package's Hex Workload identities 404 with Hex support and full owner access; the production rollout flag is unknown. Keep Elixir unmanaged and publication-disabled meanwhile, retain its seed/history/2.0.0 target, and keep its contract consumer required. After supported workload identity access exists, accept its source/ownership/trust evidence, run Elixir preflight including docs, add its exact management/config/manifest entries without moving the shared boundary, review the generated first 2.0.0 PR, then separately authorize publication. Do not add an API-key fallback.

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

These checks make no registry writes. `check-release-config.cjs --require-ready` intentionally fails until reviewed adoption and activation are recorded. Stop switches never undo existing approved registry history.
