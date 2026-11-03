# SDK releases

Maintainers approve stable publication by reviewing and merging a Release Please PR. The merged PR creates a component tag and GitHub Release, then runs fresh verification and publication in the same Actions run. Registry outcomes remain independent. There is no automatic PR merge or second routine environment approval.

## Current state

Inventory schema 2 separates `release.managed` (release PRs, version manifest, tags and GitHub Releases) from `publish.enabled` (registry candidates and recovery). Publication requires management. The implemented routes remain JS/npm, Elixir/Hex and Rust/crates.io. Internal types join and leave management with JS, have the exact same version, and never publish. All eleven contract consumers remain required regardless of publication switches.

JS, private types and Rust are now release-managed with maintainer-approved source/history adoption. Their management manifest is seeded at 1.0.3, 1.0.3 and unpublished local 1.0.1 respectively. Release Please packages and the linked JS/types plugin match that managed set. The accepted fixed history boundary is `8b4d80c05abec38d953f38b6bf59ff96462939fa`; the reviewed package source is committed revision `9bd974df2efe1693b142fed184c42785565119d7`. The generation-only policy permits release PRs and component releases when repository variable `SDK_RELEASES_ENABLED` is explicitly set to `true`; that variable remains the execution stop until activation. Every `publish.enabled` remains false, so no registry candidate or upload is eligible. Elixir stays unmanaged while its Hex/adoption prerequisites remain unresolved.

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

Reinspection on 2026-11-02 confirmed repository variables `SDK_RELEASE_APP_ID`, `SDK_RELEASE_BOT_LOGIN`, and `SDK_RELEASES_ENABLED`, with the stop switch set to `false`. The App ID is numeric and the bot login has the expected `app-slug[bot]` format. Only `SDK_RELEASE_APP_PRIVATE_KEY` remains a repository secret; no secret contents were read. This resolves the variable-location issue, while App authentication remains unverified. Both `sdk-npm` and `sdk-crates` now allow only branch `main`. The active `Protect main` ruleset requires PRs and the three release/contract/title checks, with zero required approvals so the primary contributor can merge human-authored PRs after CI passes. The repository permits squash merges and uses PR titles as squash subjects.

Install a repository-scoped GitHub App with Contents and Pull requests read/write. The App creates release PRs so normal checks run; there is no silent `GITHUB_TOKEN` fallback. Verify the configured login matches the App token action's slug. App installation/authentication was not independently verified: the installation endpoint requires App JWT authentication, and the read-only session received HTTP 401.

Restrict publisher environments to `main`, protect workflow/inventory changes through review, and configure required PR checks for the SDK contract gate, release fixtures and SDK PR-title check. Obtain actual check names from a hosted PR before configuring the rule. Do not require the push-only `SDK release policy outcomes` diagnostic on PRs: it runs after release orchestration on main. It must succeed in the release run; valid unrelated candidates continue even if that diagnostic fails.

Registry trust must name repository **Vexilla/vexilla**, calling workflow **sdk-release.yml**, and the exact environment above. Upload code lives in reusable `sdk-publish.yml`; trust names the caller. Only the final publisher requests `id-token: write`. Configure npm to allow direct `npm publish`, since staging would add an approval step. A newly created npm trust configuration must complete its first publication within two days; otherwise it expires and must be recreated. Check this account-side state shortly before the first approved publication. An authentication failure is not a reason to introduce a token fallback. npm **12.2.1** is pinned and install/pack commands explicitly suppress lifecycle scripts. Initial package setup selects Node 24.16.0; the nested test-server action subsequently resolves Node 24, so the actual package toolchain is recorded in evidence (24.22.0 for JS and 24.22.1 for Rust in the verified preflight). No `NODE_AUTH_TOKEN`, `NPM_TOKEN`, stored Hex API key, or long-lived crates.io token is needed.

Official references: [GitHub App tokens](https://github.com/actions/create-github-app-token), [npm trusted publishers](https://docs.npmjs.com/trusted-publishers), [npm 12 install policy](https://docs.npmjs.com/cli/v12/commands/npm-install/), [Hex workload identity](https://hex.pm/docs/workload-identity), and [crates.io trusted publishing](https://crates.io/docs/trusted-publishing).

## Preflight before activation

After these changes are deployed, open Actions → **SDK credential-free preflight** (`sdk-preflight.yml`), enter a full 40-character commit SHA, and select `js,rust` (or any explicit supported subset, including Elixir). It runs the complete eleven-SDK contract workflow and the same selected SDK tests, package inspection, isolated consumers and Elixir docs checks used before publication. It requests read-only contents permission and has no publisher environment, registry secrets, release writes or OIDC identity permission.

The `sdk-preflight-evidence` artifact records `kind: sdk-preflight`, `publicationAuthorized: false`, source SHA, hosted run URL/attempt, toolchain versions, all contract receipts, package/consumer receipts and file digests. The verifier rejects incomplete, stale, failed or changed evidence. Artifacts use distinct `sdk-preflight-*` names. A successful preflight is readiness evidence; it cannot authorize an upload or supply an approved release candidate.

Hosted preflight [run 41549688344](https://github.com/Vexilla/vexilla/actions/runs/41549688344), attempt 1, succeeded at merged source `136a8091bbb582b29f1386818883dfa6177c1a0b`. All eleven contract/native consumers, the required gate, JS/Rust package consumers and final evidence passed. Downloaded receipts and package bytes were independently revalidated against [the retained evidence](release-evidence/sdk-preflight-41549688344.json). This readiness record does not establish registry authentication or authorize publication.

## Adopt and activate in stages

1. Source/history adoption is maintainer-approved on 2026-11-02: npm artifact-based correspondence with its exact original SHA unknown, JS public type migration and BUSL-1.1 intent, unpublished Rust 1.0.1, reviewed package source `9bd974df2efe1693b142fed184c42785565119d7`, and fixed ancestor boundary `8b4d80c05abec38d953f38b6bf59ff96462939fa`. [The adoption record](sdk-release-adoption.md) keeps those facts separate.
2. JS/types and Rust management is prepared at 1.0.3/1.0.3/1.0.1 with `firstReleaseTarget: 2.0.0`. Managed inventory entries, Release Please packages/plugins and version-manifest membership match exactly; the external repository switch stops generation until deliberately enabled, and every publisher remains disabled. Elixir remains outside the managed set.
3. Preserve the approved boundary in both `automation.historyBoundary` and `bootstrap-sha`. The separate breaking adoption input touches JS/Rust and retains Elixir scope after that boundary. Verify the actual first proposals with pinned Release Please 17.11.2; initial target versions are not published baselines. Later Elixir management must retain the same boundary and unconsumed transition history.
4. Hosted adoption preflight is complete at the immutable source above. Accept ownership and exact trust-configuration evidence separately from reported setup before publisher enablement. Prior publication success is not required for a first publication; actual OIDC/authentication and registry outcomes remain unknown until the first approved run.
5. Review the generation-only activation change with every publisher still disabled. Once its checks pass, set repository variable `SDK_RELEASES_ENABLED=true` immediately before deliberately merging that change; its push to main supplies inventory `automation.enabled: true` and starts generation. A variable change alone does not trigger a push workflow. Verify the real App-created JS/types and Rust PRs receive all required checks and propose exactly 2.0.0. Do not merge those release PRs until the selected publishers are separately ready and enabled.
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

These checks make no registry writes. `check-release-config.cjs --require-ready` validates generation-policy readiness; repository variable `SDK_RELEASES_ENABLED` separately authorizes execution. Generation-only readiness can pass with no publishers enabled. The publisher selectors still reject automatic candidates and recovery until their per-SDK flags and evidence are accepted. Stop switches never undo existing approved registry history.
