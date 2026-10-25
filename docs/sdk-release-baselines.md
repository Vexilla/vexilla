# SDK release baselines

Registry metadata and archives were read on 2026-10-23. No registry writes, release PRs, tags, or version changes were made to establish these observations. Public owner/publisher names identify registry records; they do not establish authorization for the account or GitHub OIDC trust that will perform future uploads.

| SDK    | Registry identity          | Latest stable | Checkout before adoption | Public ownership/publisher evidence |
| ------ | -------------------------- | ------------- | ------------------------ | ----------------------------------- |
| JS     | npm `@vexilla/client`      | 1.0.3         | 1.0.3                    | npm maintainer `cmgriffing`         |
| Elixir | Hex `vexilla_client`       | 1.0.1         | 1.0.1                    | Hex owner `vexilla`                 |
| Rust   | crates.io `vexilla_client` | 1.0.0         | 1.0.1                    | 1.0.0 published by `cmgriffing`     |

Sources: [npm package metadata](https://registry.npmjs.org/@vexilla%2fclient), [Hex package metadata](https://hex.pm/api/packages/vexilla_client), and [crates.io package metadata](https://crates.io/api/v1/crates/vexilla_client). Recheck them before activation; registry observations are time dependent.

## Artifact and source correspondence

The npm 1.0.3 tarball has SHA256 `831cf21dad3ff26c7b5265de54bd452c4e76a1b6e92e15e634599276cdb9c822` and published integrity `sha512-GlyS08NeFipDO+Q5pFUUVc1fDXu0b9DzVnjqmfQ7pVGARrEYwBzLITrHoM2dHvYb6EMhsxDKovvaDsmZhGX9jg==`. Its registry record contains no `gitHead`. The package exposes `dist/index.js` and `dist/index.d.ts`, and the compatible `@vexilla/client/dist/index` import path. The archive contains seven files, including the README and license. Runtime dependencies are `case` and `dayjs`; the internal types package was a development dependency. An exact original source revision remains unresolved.

The declaration baseline includes feature discriminants, nullable schedule boundaries, authoring-shaped compatibility names such as `Group` and `VexillaEnvironment`, published shapes, `VexillaClientConfig`, and the `VexillaClient` methods. The old `VexillaManifest.version` accepts `string`. The unchanged `clients/js/test/package-consumer/compatibility.ts` fixture runs only against 1.0.3 with `--baseline`; candidates use `api.ts` and `compatibility-v2.ts` for the canonical SDK models and retained compatibility names, including the deep import. Run `node clients/js/scripts/check-package.cjs <published-1.0.3.tgz> --baseline` and the same checker on the candidate without `--baseline` to inspect both surfaces.

The canonical SDK types retain `Vexilla*` names and now alias the strict internal schema contract. Ordinary annotations need migration: schedule boundaries are numeric, manifest versions are `"v1"`, and `VexillaEnvironment` does not require editor defaults. Protected subclass fields and evaluation declarations are also stricter. Newly added `Published*`/`Wire*` exports are omitted; historical `PublishedGroup` and `PublishedEnvironment` remain deprecated compatibility names. The inventory therefore enforces the first automated JS version at **2.0.0 or higher**, pending explicit maintainer compatibility review. See [the compatibility evidence](../clients/js/test/package-consumer/README.md).

The published npm 1.0.3 artifact records package metadata `BSL-1.0` and bundles MIT license text; the repository root uses Business Source License 1.1 (`BUSL-1.1`). The maintainer has confirmed `BUSL-1.1` for future JS SDK releases. Candidate metadata now uses that identifier and its bundled license is copied from the existing root license. The inventory records `baseline.licenseConfirmed: true` and `confirmedLicense: "BUSL-1.1"`. This resolves the intended license for future candidates; the historical artifact observations and immutable `baseline.json` remain unchanged.

The downloaded Hex 1.0.1 archive has SHA256 `7f1d6690687cf0a68cb9166dda5aee6b63a5f4d85a09c3dc6e52b36ef2ed9b45`. Its native manifest and packaged source correspond to repository commit [`d62e8aad7b36ef4b3dc7ea5e5a15c604677fcf8a`](https://github.com/Vexilla/vexilla/commit/d62e8aad7b36ef4b3dc7ea5e5a15c604677fcf8a), whose subject is `chore: rename package to vexilla_client`. Package identity is `vexilla_client`, as confirmed by the archive and registry; older README naming is not a registry baseline.

The downloaded Rust 1.0.0 archive has SHA256 `87e537f80240ba852e2a1f65a0246aa6d633cdf67a8c3b49133f01db7e096b14`, matching the registry checksum. Its `.cargo_vcs_info.json` records source commit [`67480837e705ab1acf6f8ddf5f2e7c00cf7e940c`](https://github.com/Vexilla/vexilla/commit/67480837e705ab1acf6f8ddf5f2e7c00cf7e940c) and `path_in_vcs: clients/rust`. The local 1.0.1 manifest is therefore ahead of the registry; it must not be described as an already published release or silently downgraded. The old archive also contains Bazel build integration that the new package allowlist excludes.

These source observations do not choose the initial automated history boundary. Adoption still needs a maintainer decision about the unpublished Rust version, public npm compatibility, current package ownership, and which reviewed changes the first automated release must include.

## Published Release Please verification

Both production orchestration and offline fixtures load the exact npm package `release-please@17.11.2`, pinned in `scripts/releases/package.json` and `package-lock.json`. This is a [published release](https://github.com/googleapis/release-please/releases/tag/v17.11.2), rather than unreleased repository source. Its npm integrity is `sha512-we0+NgyHjvczxrilD6aujnRNuASd65Jem0dY5evevxSZvz8BnKnB/QRN3UzGA229fcV09lKCYbqeE9HgkXzGmA==`. The build requires Node >=22; this repository runs it on Node 24.

`release-config.test.cjs` feeds an offline fake SCM into the published `Manifest.fromManifest` and `buildPullRequests`/`createPullRequests` APIs. It uses the repository's actual release configuration, native manifest updaters, and production release-input adapter. That adapter counts `packages/publishing/src/validation.ts`, which the SDK bundles, as JS input without versioning the publishing package. The fake SCM offers no registry client, automatic merge, or real network writes. Its version numbers are deliberately synthetic and are never production baseline seeds.

| Commit fixture                                      | Synthetic starting versions | Observed result                                               |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| Types-only `feat(types)!`                           | JS/types 1.2.3              | One PR; JS/types both 2.0.0                                   |
| JS-only `fix(js)`                                   | JS/types 1.2.3              | One PR; JS/types both 1.2.4; both package manifests updated   |
| Shared validator `fix` / breaking `feat!`             | JS/types 1.2.3              | One linked PR; JS/types both 1.2.4 / 2.0.0                   |
| JS patch plus types feature                         | JS/types 1.2.3              | One PR; highest impact selects 1.3.0 for both                 |
| Elixir-only `fix(elixir)`                           | Elixir 2.3.4                | One Elixir PR; `mix.exs` updates to 2.3.5                     |
| Rust-only `feat(rust)`                              | Rust 3.4.5                  | One Rust PR; `Cargo.toml`/`Cargo.lock` updates to 3.5.0       |
| Simultaneous JS, Elixir, Rust features              | Independent versions above  | Three PRs; linked JS/types plus independent Elixir and Rust   |
| Later releasable commit while JS/types PR is open   | Existing synthetic patch PR | Existing group PR updated; no merge or publication            |
| App/serialization/editing or dormant/excluded SDK changes | Any fixture baseline    | No SDK release PR                                             |
| Ordinary docs/chore commits                         | Any fixture baseline        | No independent SDK release PR                                 |
| `Release-As: 2.0.0-beta.1` trailer                  | JS/types 1.2.3              | Stable-version guard rejects the candidate before PR creation |

The actual build generates `release-please--branches--main--groups--js-types` for the linked group and separate `...--components--client-elixir` and `...--components--client-rust` branches. Components have unique `client-js`, `client-types`, `client-elixir`, and `client-rust` tag identities. Default labels contain a space after the colon: `autorelease: pending` and `autorelease: tagged`. Internal types have their own manifest/changelog/tag bookkeeping and no registry candidate.

## Adoption gate

`.release-please-manifest.json` is intentionally empty and `bootstrap-sha` is unset. `automation.enabled` remains false in the inventory, so the workflow cannot call Release Please with fallback initial versions or treat all historical commits as unreleased work. The repository variable `SDK_RELEASES_ENABLED` is an additional gate.

Before activation, record `baseline.verified: true`, `ownershipVerified: true`, an exact `sourceRevision`, and the reviewed `manifestVersion` for each active SDK. JS additionally requires `publicTypeCompatibilityReviewed: true` and the maintainer-confirmed `licenseConfirmed: true` with `confirmedLicense: "BUSL-1.1"`. License intent is resolved; the remaining adoption prerequisites still apply. The selected manifest baseline cannot be lower than the verified registry version. Align JS/types manifests and package versions without regressing JS. Set `automation.historyBoundary` and `bootstrap-sha` to the same deliberately selected full commit SHA; seed all four managed manifest entries. Subsequent releases may advance beyond the adoption baseline, but may not fall below it. Prospective PR versions must be strictly greater than the current managed version, and an approved tag must equal its checked-out manifest before creation; stable `Release-As` trailers cannot bypass those guards or the JS 2.0.0 floor.

`node scripts/releases/check-release-config.cjs` validates the dormant configuration. `node scripts/releases/check-release-config.cjs --require-ready` intentionally fails until adoption is verified. Neither public registry metadata nor local successful fixtures is sufficient to change those flags. Complete the [rollout prerequisites and hosted checks](sdk-releases.md) before generating the first real release PR.
