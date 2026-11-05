# SDK major-2 adoption record and activation checklist

The maintainer approved the proposed JS/Rust source/history adoption choices on 2026-11-02 and committed the implementation at `9bd974df2efe1693b142fed184c42785565119d7`. Management is now prepared for JS/types and Rust. Generation-only activation is complete through PR #71. The publisher-activation policy below enables JS/npm and Rust/crates.io after maintainer-confirmed ownership and trust; it takes effect when reviewed and merged to main. Runtime registry authentication and publication remain unobserved.

## Accepted source and history

The accepted fixed shared history boundary is **`8b4d80c05abec38d953f38b6bf59ff96462939fa`** (`docs: update README toml data for majority of clients (#68)`). The reviewed committed package source is the distinct revision **`9bd974df2efe1693b142fed184c42785565119d7`** (`ci: coordinate SDK major releases and add publishing preflight`). An ancestry check confirms the boundary precedes that source. The existing `ci:` commit does not request a release; the separate `feat(sdk)!` adoption commit updates the SDK adoption notes after the boundary and requests the intentional major transition.

This recent boundary deliberately excludes accumulated historical changes from Release Please's automatic changelog scan. Adoption notes therefore account for the existing parity/contract work, stricter JS public schema types, FNV hashing and scheduling/validation fixes, native production dependencies, package allowlists, licenses and isolated consumers. The maintainer accepted this accumulated source/artifact scope as part of adoption. Native comparisons from their published source commits to the boundary span 22 Rust files and 14 Elixir files; generated compatibility assets account for much of that size. Rust local 1.0.1 remains an unpublished working version.

The npm 1.0.3 sourcemap contains five original source files. All five exactly match both repository revisions `eb15bb1fd7e59e889f501dd5334c65c670562d55` and `fd5f8c864c11c9ef7bbd447cc9ace17678844319`. This narrows source correspondence but cannot identify the exact publication commit: registry `gitHead` is absent, multiple commits contain identical sources, and build/declaration inputs extend beyond the sourcemap. Keep `baseline.sourceRevision: null`. The maintainer explicitly accepted artifact-based correspondence and this historical-source limitation. `artifactComparisonAccepted` and `historicalSourceUncertaintyAccepted` are recorded without substituting the boundary or adoption SHA for the unknown original source.

| Fact                   | JS/types                                   | Rust                                       | Elixir later                                |
| ---------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------- |
| Registry baseline      | JS 1.0.3; types private                    | 1.0.0                                      | 1.0.1                                       |
| Historical source      | Exact npm commit unresolved                | `67480837e705ab1acf6f8ddf5f2e7c00cf7e940c` | `d62e8aad7b36ef4b3dc7ea5e5a15c604677fcf8a`  |
| Management seed        | Both 1.0.3                                 | Unpublished 1.0.1                          | 1.0.1                                       |
| First target           | Exactly 2.0.0                              | Exactly 2.0.0                              | Exactly 2.0.0 while policy remains 2        |
| Adoption source        | `9bd974df2efe1693b142fed184c42785565119d7` | `9bd974df2efe1693b142fed184c42785565119d7` | Pending reviewed later adoption             |
| Management/publication | Managed; publication enabled by policy               | Managed; publication enabled by policy               | Unmanaged; publication stopped; Hex pending |

## Recorded management acceptance

- The maintainer accepted npm artifact-based correspondence and unknown exact original provenance, the documented JS public type migration and confirmed BUSL-1.1 intent. `baseline.sourceRevision` remains null; archive identity and digest are unchanged. [JS migration/consumer evidence](../clients/js/test/package-consumer/README.md) records numeric schedule dates, literal `v1`, environment models and protected declarations.
- Rust retains published registry 1.0.0 with known historical provenance and accepted unpublished local 1.0.1 plus accumulated changes. No downgrade or invented registry release is recorded.
- JS and Rust baselines record `verified: true`, full `adoptionSourceRevision`, reviewed management seed/version and dated maintainer acceptance. This source/history acceptance does not mark ownership, OIDC configuration, hosted preflight or publication successful.
- `release.managed: true` selects JS/types and Rust. Release Please packages, linked plugin and management manifest match exactly, with versions 1.0.3/1.0.3/1.0.1. The accepted boundary is recorded identically in inventory and `bootstrap-sha`.
- PR #71 enabled generation policy with all publishers disabled; real release PRs #72 and #73 now exist and have passed their contract checks. This publisher-activation policy enables only JS and Rust. Elixir remains unmanaged and retains its seed, target and adoption history pending Hex and its own evidence.
- The separate breaking adoption input retains reviewed notes under `clients/js/ADOPTION.md`, `clients/rust/ADOPTION.md`, and `clients/elixir/ADOPTION.md`. It is verified through the pinned generator without creating real release PRs or tags.

## Hosted verification and configuration evidence

Run **SDK credential-free preflight** at the final immutable adoption SHA with `js,rust`. Accept its run URL and attempt, all eleven contract receipts, selected package/consumer/toolchain receipts and digests. `sdk-preflight-evidence` is not a release candidate. A final approved release must repeat these checks at the exact merged revision.

Hosted preflight succeeded at exact merged source `136a8091bbb582b29f1386818883dfa6177c1a0b`: [run 41549688344](https://github.com/Vexilla/vexilla/actions/runs/41549688344), attempt 1. All eleven contract/native consumers and the JS/Rust package/isolated-consumer jobs passed. Downloaded receipts, source SHA and package bytes were independently revalidated against [the original hosted evidence](release-evidence/sdk-preflight-41549688344.json). Its SHA256 is `6bac1f08b118642fcc9872fdb1b435cc1343a2e9a40b6199dadba7057b6d1515`; [the evidence index](release-evidence/README.md) records scope and actual toolchains. Each selected publisher records preflight readiness separately from the maintainer-confirmed ownership/trust below and from runtime authentication, which remains unobserved.

The following table preserves the configuration observations from the 2026-11-02 generation-only preparation. The publisher-activation record below supersedes the pending App-check and npm/crates ownership/trust items:

| Check                 | Observation                                                                                              | Remaining action                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Release variables     | All three repository variables present; App ID and bot-login formats valid; `SDK_RELEASES_ENABLED=false` | Placement verified; retain the stop switch until separate activation                                |
| Secret names          | Only `SDK_RELEASE_APP_PRIVATE_KEY` remains a repository secret                                           | Keep the PEM private key secret; authentication is still unverified                                 |
| Environments          | `sdk-npm` and `sdk-crates` allow only branch `main`                                                      | Verified; keep no second routine environment reviewer gate                                          |
| PR protection         | Active Protect main ruleset: PR required, zero approvals, three CI checks and up-to-date branch          | Verify actual App-created release PR checks; docs-only PR exclusion removed                         |
| Squash defaults       | Enabled, subject `PR_TITLE`                                                                              | Preserve breaking `!` in adopted commit titles                                                      |
| App installation      | App-authenticated endpoint returned 401 to the session's token                                           | Independently verify App permissions, installation, configured ID/login and eventual real PR checks |
| npm/crates trust      | Maintainer-reported; no account-side configuration proof read here                                       | Accept exact repository/caller/environment/ownership evidence; do not infer runtime success         |
| Hex workload identity | Maintainer reports 404                                                                                   | Resolve external access; retain unmanaged/disabled state and OIDC-only design                       |

No prior successful registry publication is required to permit a first approved publication. Record ownership and trust as accepted configuration evidence, then record actual authentication and publication only when the final approved run observes them.

## Publisher activation (2026-11-05)

The maintainer confirmed package ownership and the exact account-side trusted publisher setup in the SDK publishing task. This is accepted maintainer configuration evidence; the account settings were not independently inspected by this change.

| Registry package | Repository | Calling workflow | Environment |
| ---------------- | ---------- | ---------------- | ----------- |
| npm `@vexilla/client` | `Vexilla/vexilla` | `sdk-release.yml` | `sdk-npm` |
| crates.io `vexilla_client` | `Vexilla/vexilla` | `sdk-release.yml` | `sdk-crates` |

The inventory records `baseline.ownershipVerified`, `publish.trustVerified` and the confirmation date/evidence for JS and Rust, then sets their `publish.enabled` flags to true. Private types never publish; Elixir and every other registry route remain disabled. The accepted source/history boundary, management seeds and original hosted preflight evidence are unchanged.

The App generated [JS/types release PR #72](https://github.com/Vexilla/vexilla/pull/72) and [Rust release PR #73](https://github.com/Vexilla/vexilla/pull/73), both proposing 2.0.0. The JS [PR Test run](https://github.com/Vexilla/vexilla/actions/runs/41561274513), attempt 1, and Rust [PR Test rerun](https://github.com/Vexilla/vexilla/actions/runs/41561294164/attempts/2) succeeded, including all eleven SDK contracts and the required gate. Rust's first PR run failed in an app browser test; the unchanged revision passed on rerun. These observations establish App-created PR checks, not registry authentication.

`authenticationObserved` and `publicationObserved` remain false for both registries. Enabling this policy does not replay historical tags or upload a package by itself. Final approved release merges still require fresh contracts, package inspection, isolated consumers, current-policy authorization and OIDC authentication. Recheck npm's direct `npm publish` permission and its two-day unused-configuration expiry just before the first release merge.

## Separately authorized activation

1. Source/history adoption, hosted preflight and the real App-created release PR contract checks are complete. The maintainer has confirmed the exact registry ownership/trust settings above.
2. Review this JS/Rust publisher-activation change and merge it after its required checks pass. Keep repository variable `SDK_RELEASES_ENABLED=true` for release execution. Merging this configuration alone creates no registry upload and scans no historical backlog.
3. Refresh release PRs #72 and #73 against the new main and wait for their required checks. Keep their generated titles unchanged because release parsing uses those titles.
4. Deliberately merge the JS release PR, inspect the final verification/publication run and confirm npm 2.0.0, then repeat for Rust/crates.io 2.0.0. The final run rechecks the exact approved source and current policy; prior preflight bytes are not release candidates.
5. Stop new runs with `SDK_RELEASES_ENABLED=false`; stop in-flight authorization through a current-main inventory stop or per-publisher disablement and deliberate cancellation where needed. Recover only an exact existing approved current-major tag; no backlog replay, replacement releases, moved tags or token fallback.

Elixir joins independently after Hex access and its adoption/docs/preflight evidence are accepted, preserving this same boundary and its retained history. If policy has moved to 3 before then, its old 2.0.0 target/1.x seed require a revised adoption design; changing a flag or relabeling the target is insufficient.

## Local verification (2026-11-02)

- All 105 release configuration/generator, orchestration, publication, native packaging, preflight and workflow-policy fixtures passed.
- Contract generation succeeded; producer checks passed (1 types, 47 publishing, 6 app-publication and 297 app/config tests), including generated-source and brace checks. All 35 contract gate/compatibility/revision tests passed. These checks are not a run of all eleven native SDK toolchains.
- Actionlint 1.7.12 passed for SDK and contract workflows.
- With actual Node 24.16.0 and npm 12.2.1, the original npm 1.0.3 tarball passed isolated baseline declarations and CommonJS/ESM consumers; the rebuilt pre-major candidate passed its current API/type fixtures and both runtime imports. Original SHA256: `831cf21dad3ff26c7b5265de54bd452c4e76a1b6e92e15e634599276cdb9c822`. Local rebuilt SHA256: `1bce1af4c9bcd3d48bcc2331f364e4fb5757e7828497f80c111527555696112a`. That local candidate still identifies its truthful working version 1.0.3 and is not approved for publication.
- The real npm 12 policy fixture confirmed default dependency lifecycle-script blocking and explicit `--ignore-scripts` suppression without broad install allowances.
- Generation-policy validation passes with accepted managed adoption and all publishers disabled. The separate repository variable stops execution until explicit activation; local policy readiness does not authorize registry uploads. No registry authentication or upload was attempted.

## Verify committed first-release inputs

Run `node scripts/releases/check-adoption.cjs <full-commit-SHA>` after the separate breaking adoption commit. The helper reads that exact revision's inventory, Release Please configuration, management manifest, native files and real git history after the accepted boundary, then requires JS/types and Rust proposals to target exactly 2.0.0. Its JSON evidence lists the immutable revision and manifest/lock/changelog update paths. The helper provides no remote mutation methods and works while global generation/publication remain disabled.

The portable CI fixture uses captured actual pre-adoption commit descriptors and a clearly identified prepared breaking input so shallow checkouts can verify the same seeds and generated updates. Actual committed-history evidence is recorded separately after the real adoption commit; a synthetic prepared input does not claim a commit or release exists.
