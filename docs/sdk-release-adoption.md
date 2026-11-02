# SDK major-2 adoption review

This is a concrete review checklist, not an activation record. Publication and release generation remain stopped. No release PR, tag, registry upload or account configuration was created by this implementation.

## Source and history proposal

The checkout began at **`8b4d80c05abec38d953f38b6bf59ff96462939fa`** (`docs: update README toml data for majority of clients (#68)`). Propose that existing full ancestor as the shared history boundary. The adoption source must be the separate immutable commit containing the reviewed implementation, package bookkeeping and adoption inputs. That commit does not exist yet; the current working tree must not be passed off as an immutable adoption SHA. Neither value has been marked accepted in the inventory.

This recent boundary deliberately excludes accumulated historical changes from Release Please's automatic changelog scan. Adoption notes therefore account for the existing parity/contract work, stricter JS public schema types, FNV hashing and scheduling/validation fixes, native production dependencies, package allowlists, licenses and isolated consumers. Review the full source/artifact differences before accepting this scope. Native comparisons from their published source commits to the boundary span 22 Rust files and 14 Elixir files; generated compatibility assets account for much of that size. Rust local 1.0.1 remains an unpublished working version.

The npm 1.0.3 sourcemap contains five original source files. All five exactly match both repository revisions `eb15bb1fd7e59e889f501dd5334c65c670562d55` and `fd5f8c864c11c9ef7bbd447cc9ace17678844319`. This narrows source correspondence but cannot identify the exact publication commit: registry `gitHead` is absent, multiple commits contain identical sources, and build/declaration inputs extend beyond the sourcemap. Keep `baseline.sourceRevision: null`. Artifact-based adoption requires explicit acceptance of that historical-source limitation, not substitution of the boundary or adoption SHA.

| Fact                   | JS/types                       | Rust                                       | Elixir later                               |
| ---------------------- | ------------------------------ | ------------------------------------------ | ------------------------------------------ |
| Registry baseline      | JS 1.0.3; types private        | 1.0.0                                      | 1.0.1                                      |
| Historical source      | Exact npm commit unresolved    | `67480837e705ab1acf6f8ddf5f2e7c00cf7e940c` | `d62e8aad7b36ef4b3dc7ea5e5a15c604677fcf8a` |
| Management seed        | Both 1.0.3                     | Unpublished 1.0.1                          | 1.0.1                                      |
| First target           | Exactly 2.0.0                  | Exactly 2.0.0                              | Exactly 2.0.0 while policy remains 2       |
| Adoption source        | Pending final immutable commit | Pending final immutable commit             | Pending reviewed later adoption            |
| Management/publication | Both stopped                   | Both stopped                               | Both stopped; Hex external dependency      |

## Review before recording management

- Accept npm artifact-based correspondence and historical-source uncertainty explicitly; retain the original archive digest/integrity. Review [JS migration and type-consumer evidence](../clients/js/test/package-consumer/README.md), including numeric schedule dates, literal `v1`, environment defaults and protected subclass declarations. BUSL-1.1 intent is already maintainer-confirmed.
- Accept Rust's unpublished local 1.0.1 and all accumulated changes against published 1.0.0 without downgrading or inventing a release.
- Accept the proposed shared ancestor boundary above and record the final adoption-source SHA separately for each managed SDK. Verify ancestry and that the breaking adoption input follows the boundary.
- Commit reviewed adoption notes under each SDK with a breaking Conventional Commit subject such as `feat(sdk)!: adopt the shared major-2 SDK contract`. The relevant file paths must be present in that commit. Keep Elixir's equivalent input unconsumed when it later joins management.
- Set only evidence-ready JS/types and Rust `release.managed: true`, add their exact Release Please package entries, the JS/types linked plugin, and management-manifest entries 1.0.3/1.0.3/1.0.1. Set `bootstrap-sha` equal to the accepted boundary. Retain `publish.enabled: false` and global stop controls. The current zero-managed configuration is intentional until these decisions are accepted.
- Validate accepted `baseline.verified`, `adoptionSourceRevision`, historical provenance or explicit npm uncertainty acceptance, `manifestVersion`, JS compatibility review, and management seeds. Avoid treating synthetic fixture evidence as actual registry/account authority.

## Hosted verification and configuration evidence

Run **SDK credential-free preflight** at the final immutable adoption SHA with `js,rust`. Accept its run URL and attempt, all eleven contract receipts, selected package/consumer/toolchain receipts and digests. `sdk-preflight-evidence` is not a release candidate. A final approved release must repeat these checks at the exact merged revision.

The new workflow is not deployed on main (read-only contents API returned 404 on 2026-11-02), so no hosted run URL, immutable final adoption SHA or complete hosted receipts are claimed here. The GitHub workflow skill's optional `ci_monitor.cjs` helper is absent from both this repository and the installed skill; no CI dispatch was attempted through an alternate route. Once deployed, dispatch the workflow through the Actions UI and record its evidence here.

The maintainer reports that the App and npm/crates.io trust are configured. Independent GitHub inspection on 2026-11-02 found:

| Check                 | Observation                                                                                              | Remaining action                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Release variables     | All three repository variables present; App ID and bot-login formats valid; `SDK_RELEASES_ENABLED=false` | Placement verified; retain the stop switch until separate activation                                |
| Secret names          | Only `SDK_RELEASE_APP_PRIVATE_KEY` remains a repository secret                                           | Keep the PEM private key secret; authentication is still unverified                                 |
| Environments          | `sdk-npm`, `sdk-crates`, `sdk-hex` exist, no branch policy                                               | Restrict deployment to main                                                                         |
| PR protection         | No main branch protection; no repository rulesets                                                        | Require review and actual hosted contract/release-fixture/title check names                         |
| Squash defaults       | Enabled, subject `PR_TITLE`                                                                              | Preserve breaking `!` in adopted commit titles                                                      |
| App installation      | App-authenticated endpoint returned 401 to the session's token                                           | Independently verify App permissions, installation, configured ID/login and eventual real PR checks |
| npm/crates trust      | Maintainer-reported; no account-side configuration proof read here                                       | Accept exact repository/caller/environment/ownership evidence; do not infer runtime success         |
| Hex workload identity | Maintainer reports 404                                                                                   | Resolve external access; retain unmanaged/disabled state and OIDC-only design                       |

No prior successful registry publication is required to permit a first approved publication. Record ownership and trust as accepted configuration evidence, then record actual authentication and publication only when the final approved run observes them.

## Separately authorized activation

1. Accept the review above and successful hosted preflight, retaining its exact revision and artifacts.
2. Enable **release generation** in reviewed inventory plus repository variable, with all publishers still disabled. Check real App-authored release PRs receive all required checks; local transport fixtures do not establish that operational fact.
3. Verify the first JS/types and Rust PRs propose exactly 2.0.0 and update manifests, locks and changelogs. Enable each publisher only after its ownership, exact trust, preflight and environment prerequisites are accepted. Confirm npm direct-publish permission and any first-use trust expiry in account settings.
4. Deliberately review/merge each PR. Require fresh final contract/native/package/consumer checks at its exact approved SHA and inspect final policy/source identities and registry outcomes. Do not substitute preflight bytes.
5. Stop new runs with `SDK_RELEASES_ENABLED=false`; stop in-flight authorization through a current-main inventory stop or per-publisher disablement and deliberate cancellation where needed. Recover only an exact existing approved current-major tag; no backlog replay, replacement releases, moved tags or token fallback.

Elixir joins independently after Hex access and its adoption/docs/preflight evidence are accepted, preserving this same boundary and its retained history. If policy has moved to 3 before then, its old 2.0.0 target/1.x seed require a revised adoption design; changing a flag or relabeling the target is insufficient.

## Local verification (2026-11-02)

- All 100 release configuration/generator, orchestration, publication, native packaging, preflight and workflow-policy fixtures passed.
- Contract generation succeeded; producer checks passed (1 types, 47 publishing, 6 app-publication and 297 app/config tests), including generated-source and brace checks. All 35 contract gate/compatibility/revision tests passed. These checks are not a run of all eleven native SDK toolchains.
- Actionlint 1.7.12 passed for SDK and contract workflows.
- With actual Node 24.16.0 and npm 12.2.1, the original npm 1.0.3 tarball passed isolated baseline declarations and CommonJS/ESM consumers; the rebuilt pre-major candidate passed its current API/type fixtures and both runtime imports. Original SHA256: `831cf21dad3ff26c7b5265de54bd452c4e76a1b6e92e15e634599276cdb9c822`. Local rebuilt SHA256: `1bce1af4c9bcd3d48bcc2331f364e4fb5757e7828497f80c111527555696112a`. That local candidate still identifies its truthful working version 1.0.3 and is not approved for publication.
- The real npm 12 policy fixture confirmed default dependency lifecycle-script blocking and explicit `--ignore-scripts` suppression without broad install allowances.
- Production configuration validation passed in stopped state; `--require-ready` intentionally rejected unresolved adoption/global enablement. No registry authentication or upload was attempted.
