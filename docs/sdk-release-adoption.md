# SDK major-2 adoption record and activation checklist

The maintainer approved the proposed JS/Rust source/history adoption choices on 2026-11-02 and committed the implementation at `9bd974df2efe1693b142fed184c42785565119d7`. Management is now prepared for JS/types and Rust. The generation-only policy is prepared; repository variable `SDK_RELEASES_ENABLED` still stops execution until deliberate activation, and every publisher remains disabled. No registry authentication or release mutation is implied by source adoption or preflight readiness.

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
| Management/publication | Managed; publication stopped               | Managed; publication stopped               | Unmanaged; publication stopped; Hex pending |

## Recorded management acceptance

- The maintainer accepted npm artifact-based correspondence and unknown exact original provenance, the documented JS public type migration and confirmed BUSL-1.1 intent. `baseline.sourceRevision` remains null; archive identity and digest are unchanged. [JS migration/consumer evidence](../clients/js/test/package-consumer/README.md) records numeric schedule dates, literal `v1`, environment models and protected declarations.
- Rust retains published registry 1.0.0 with known historical provenance and accepted unpublished local 1.0.1 plus accumulated changes. No downgrade or invented registry release is recorded.
- JS and Rust baselines record `verified: true`, full `adoptionSourceRevision`, reviewed management seed/version and dated maintainer acceptance. This source/history acceptance does not mark ownership, OIDC configuration, hosted preflight or publication successful.
- `release.managed: true` selects JS/types and Rust. Release Please packages, linked plugin and management manifest match exactly, with versions 1.0.3/1.0.3/1.0.1. The accepted boundary is recorded identically in inventory and `bootstrap-sha`.
- The generation-only policy sets `automation.enabled: true`, while external `SDK_RELEASES_ENABLED` remains false until explicit activation. Every `publish.enabled` stays false. Elixir remains unmanaged and retains its seed, target and adoption history pending Hex and its own evidence.
- The separate breaking adoption input retains reviewed notes under `clients/js/ADOPTION.md`, `clients/rust/ADOPTION.md`, and `clients/elixir/ADOPTION.md`. It is verified through the pinned generator without creating real release PRs or tags.

## Hosted verification and configuration evidence

Run **SDK credential-free preflight** at the final immutable adoption SHA with `js,rust`. Accept its run URL and attempt, all eleven contract receipts, selected package/consumer/toolchain receipts and digests. `sdk-preflight-evidence` is not a release candidate. A final approved release must repeat these checks at the exact merged revision.

Hosted preflight succeeded at exact merged source `136a8091bbb582b29f1386818883dfa6177c1a0b`: [run 41549688344](https://github.com/Vexilla/vexilla/actions/runs/41549688344), attempt 1. All eleven contract/native consumers and the JS/Rust package/isolated-consumer jobs passed. Downloaded receipts, source SHA and package bytes were independently revalidated against [the original hosted evidence](release-evidence/sdk-preflight-41549688344.json). Its SHA256 is `6bac1f08b118642fcc9872fdb1b435cc1343a2e9a40b6199dadba7057b6d1515`; [the evidence index](release-evidence/README.md) records scope and actual toolchains. Each selected publisher records preflight readiness separately from still-unverified ownership/trust and runtime authentication.

The maintainer reports that the App and npm/crates.io trust are configured. Independent GitHub inspection on 2026-11-02 found:

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

## Separately authorized activation

1. Source/history and hosted adoption preflight above are verified. Exact publishing ownership/trust and runtime outcomes remain separate. The selected publishers stay disabled while the first real App-created release PRs are checked.
2. Review and pass CI for this **generation-only** change. Set repository variable `SDK_RELEASES_ENABLED=true` immediately before deliberately merging it, leaving every publisher disabled. Its main push triggers generation under `automation.enabled: true`. Confirm actual App-authored release PRs receive all required checks; a variable edit alone triggers no workflow.
3. Verify the first JS/types and Rust PRs propose exactly 2.0.0 and update manifests, locks and changelogs. Enable each publisher only after its ownership, exact trust, preflight and environment prerequisites are accepted. Confirm npm direct-publish permission and any first-use trust expiry in account settings.
4. Deliberately review/merge each PR. Require fresh final contract/native/package/consumer checks at its exact approved SHA and inspect final policy/source identities and registry outcomes. Do not substitute preflight bytes.
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
