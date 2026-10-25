# Native SDK packaging and registry setup

The native routes publish `vexilla_client` to Hex (Elixir) and crates.io (Rust).
Their shared name does not imply shared versions or tags. Maintainers approve
`client-elixir-v<VERSION>` and `client-rust-v<VERSION>` through their separate
release PRs. See [SDK releases](sdk-releases.md) for orchestration and activation.

## Registry baseline audit

Read-only public API and archive inspection on 2026-10-23 established:

| Registry | Published stable version | Current public owner | Source evidence | Registry SHA256 |
| --- | --- | --- | --- | --- |
| Hex, `hexpm/vexilla_client` | 1.0.1, 2024-06-15 | `vexilla` (`hello@vexilla.dev`); release publisher `cmgriffing` | Every archived file matches `clients/elixir` at `d62e8aad7b36ef4b3dc7ea5e5a15c604677fcf8a` byte for byte | `7f1d6690687cf0a68cb9166dda5aee6b63a5f4d85a09c3dc6e52b36ef2ed9b45` |
| crates.io, `vexilla_client` | 1.0.0, 2024-05-09 | GitHub user `cmgriffing` | Archive `.cargo_vcs_info.json`: revision `67480837e705ab1acf6f8ddf5f2e7c00cf7e940c`, path `clients/rust` | `87e537f80240ba852e2a1f65a0246aa6d633cdf67a8c3b49133f01db7e096b14` |

The Rust checkout manifest is 1.0.1, ahead of its published baseline. No version
was changed or published by this audit. The initial release history must account
for that discrepancy explicitly. A public owner listing establishes the account
that must configure trust; it does not establish that the current session can
administer that account. Account access and trust remain maintainer preflight.

Sources: [Hex package metadata](https://hex.pm/api/packages/vexilla_client),
[Hex release metadata](https://hex.pm/api/packages/vexilla_client/releases/1.0.1),
[Hex package archive](https://repo.hex.pm/tarballs/vexilla_client-1.0.1.tar),
[crate releases](https://crates.io/api/v1/crates/vexilla_client),
[crate owners](https://crates.io/api/v1/crates/vexilla_client/owners), and
[crate archive](https://static.crates.io/crates/vexilla_client/vexilla_client-1.0.0.crate).

Hex's release API `checksum` is the **outer archive SHA256**, matching the bytes
in `repo.hex.pm/tarballs`. It is different from the archive's embedded `CHECKSUM`.
For baseline 1.0.1 that inner checksum is
`3154e00016d2953418100bffdac1ef684b55c7deee552d6ebcc5ecc0f3069c68`.
Recovery compares the outer digest against the API, and packaging independently
validates the inner checksum over `VERSION`, `metadata.config`, and
`contents.tar.gz`.

## Package corrections

Elixir's application, Hex package, installation example, and documentation now
agree on `vexilla_client`; `vexilla_client_elixir` was an obsolete README name.
Jason and HTTPoison are production dependencies. Jason supplies a derived encoder
in the compiled SDK, and HTTPoison is declared in `extra_applications`; limiting
either dependency to dev/test produced an unusable production installation.
ExDoc is available in the isolated `docs` environment, keeping unrelated lint
tools out of the docs build.

Both native manifests already declared `BUSL-1.1`. Elixir already included its
license text; Rust now includes an unchanged copy of the repository's Business
Source License 1.1 text. This follows the existing native manifest, root license,
and published registry metadata; it makes no new license selection. No runtime
source or native version was changed.

Rust's archive allowlist includes Rust source, `src/compatibility.json`, native
manifest/lockfile, README, license and changelog. Cargo adds its normalized manifest and VCS information.
Generated Bazel `crates/` integration, BUILD files, temporary targets and unrelated
repository files are excluded. Elixir packages only `lib`,
`priv/compatibility.json`, `mix.exs`, README, license and changelog.

## Credential-free package verification

Use the same Elixir 1.15.7 / OTP 26.2 as the shared contract workflow. Use the
workflow's Rust toolchain and committed Cargo lockfile. Python 3.9+ and Node 24
run the release helpers. Native tests need the existing checked-out fixture
server at `localhost:3000` (Elixir supports `TEST_SERVER_HOST`; the existing Rust
native test uses that address directly). Packaging consumers make no fixture
HTTP requests.

```sh
python3 scripts/releases/package-native.py elixir --revision "$(git rev-parse HEAD)" --output /tmp/sdk-elixir
python3 scripts/releases/package-native.py rust --revision "$(git rev-parse HEAD)" --output /tmp/sdk-rust
node --test scripts/releases/publish-native.test.cjs
```

These commands make no registry writes. They fetch reviewed public dependencies,
require `HEAD` to equal the full release revision, and use locked native installs.
Run `mix test` and `cargo test --locked` with the fixture server as separate native
checks before accepting the candidate. Verification jobs receive no publishing
credentials.

The Elixir route builds a Hex tarball and checks its identity, file allowlist and
inner checksum. A new production Mix project consumes only the extracted tarball,
installs its production dependencies against the reviewed lock and starts the
application, verifies Jason/HTTPoison, and constructs the client. ExDoc generates
`doc/index.html` with source links pinned to the release SHA; a deterministic
gzip tar captures those generated docs.

The Rust route runs `cargo package --locked`, including Cargo's extracted-package
build verification. A separate temporary consumer outside the checkout depends
only on the extracted `.crate` and constructs a client with `cargo run --locked`.
It has no sibling workspace sources. Native API upload metadata is derived using
`cargo metadata` from the inspected extracted crate.

A successful output directory contains `receipt.json`, the package archive, and
Elixir's docs archive. The receipt binds SDK, registry package name, stable
manifest version, full revision, file list, verification flags and SHA256 digests.
No success receipt survives a failed run. The workflow binds this receipt and its
bytes into its approved `candidate.json`.

The publisher **uploads those verified bytes directly**, without repackaging.
Hex receives the original `.tar` and docs `.tar.gz`; crates.io receives the
original `.crate` inside the Cargo registry API's length-prefixed metadata/archive
envelope. Digest and identity checks run before registry authentication.

## Hex workload identity

The existing `vexilla` package owner needs full owner access and two-factor
authentication. Open `vexilla_client` → **Workload identities**, and configure:

| Field | Value |
| --- | --- |
| Repository owner | `Vexilla` |
| Repositories | `vexilla` |
| Workflow filename | `sdk-release.yml` |
| GitHub environment | `sdk-hex` |
| Package | Public `hexpm/vexilla_client` |

Trust names the actual calling workflow, `sdk-release.yml`, even though its
publisher job is implemented in reusable `sdk-publish.yml`. A public repository
requires an environment. Create that environment with `main` deployment
restrictions and no second routine approval after the release PR is merged.
Trust binds immutable GitHub owner/repository IDs; moving or recreating them
requires updating the registry configuration.

The publisher discovers the audience at `GET https://hex.pm/api/oidc/audience`,
requests the GitHub OIDC token with that audience, and posts a JWT-bearer grant to
`https://hex.pm/api/oauth/token` with scope `package:hexpm/vexilla_client`. Hex
returns a package-scoped token valid for 15 minutes. The script uses
`Authorization: Bearer <token>` and masks the token in Actions. It does not use a
stored Hex API key. Only publisher jobs have `id-token: write`.

Package existence is required: Hex workload identities cannot publish a public
package's first release. This package already exists; any future new package
needs a separately authorized maintainer bootstrap. Check current full ownership
and configured trust before activation. See [official Hex workload identity
documentation](https://hex.pm/docs/workload-identity).

## crates.io trusted publishing

The existing `cmgriffing` crate owner configures `vexilla_client` → **Settings** →
**Trusted Publishing** → **Add** → **GitHub**:

| Field | Value |
| --- | --- |
| Repository owner | `Vexilla` |
| Repository name | `vexilla` |
| Workflow filename | `sdk-release.yml` |
| Environment | `sdk-crates` |

Create `sdk-crates` with the same `main` deployment restrictions and release-PR
approval policy. The publishing job invokes the pinned official
`rust-lang/crates-io-auth-action` only after verification. Its `token` output is
passed as `CARGO_REGISTRY_TOKEN` to the native publisher; the action exchanges
GitHub's identity for a token valid for 30 minutes and revokes it in its post
step. There is no long-lived token fallback.

The crate must already exist; its initial publication requires a separate owner
bootstrap. This crate already exists. Confirm ownership and exact caller/workflow/
environment configuration before activation. See [official crates.io trusted
publishing](https://crates.io/docs/trusted-publishing) and [the official auth
action](https://github.com/rust-lang/crates-io-auth-action).

## Immutable publication and docs recovery

Use the normal release workflow's recovery dispatch described in
[SDK releases](sdk-releases.md). Do not invoke the low-level publisher to bypass
approval, inventory, contract or native checks.

Before any upload, the native publisher looks up the exact package version.
Only HTTP 404 means absence; authentication, rate-limit, availability, malformed
response and network failures fail the attempt. An existing version succeeds
only if its registry checksum matches the verified package archive. A differing,
yanked, retired or unverifiable version fails. No overwrite, replace, unpublish,
yank, version bump or tag move is performed.

If the upload response is lost, a second authoritative lookup can prove that
those same bytes were stored. If it cannot, recovery retries the same approved
release after investigation. An SDK's failure does not change another SDK's
recorded result.

Hex docs are tracked separately. After a package checksum matches, the publisher
checks `https://repo.hex.pm/docs/vexilla_client-<VERSION>.tar.gz` against the
verified docs digest. It uploads docs only when absent; a lost response is
reconciled with that archive. Existing different docs fail without replacement.
Thus a docs-only failure retries docs for the approved version without uploading
the already verified package again. Keep original candidate artifacts when
retrying: rebuilding with a different toolchain can change bytes, and matching
version strings alone are insufficient evidence.

The mocked native publisher tests cover absent uploads, lost responses,
conflicting packages/docs, HTTP lookup failures, missing trust, artifact
corruption and docs-only recovery. They perform no real network calls or
registry writes.
