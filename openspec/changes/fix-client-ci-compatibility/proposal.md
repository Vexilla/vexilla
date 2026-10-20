## Why

[Test run 39336758899](https://github.com/Vexilla/vexilla/actions/runs/39336758899) fails in Bazel, OCaml, and PHP before client tests execute because CI selects incompatible tooling or relies on unavailable system packages. Restore these jobs with focused environment changes and validate them using the existing suites; the observed failures do not justify additional regression tests.

## What Changes

- Validate an exact Bazel 7 release against the existing build and coverage commands, then pin it in `.bazelversion` while retaining the current `WORKSPACE` and Bzlmod dependency structure.
- Upgrade OCaml setup to `ocaml/setup-ocaml@v3`, select compiler 4.14.2, and include the official opam archive as a lower-priority source so the existing lockfile remains installable.
- Replace the PHP container and manual installation commands with `shivammathur/setup-php@v2`, retaining PHP 7.4 and explicitly configuring Composer, required extensions, and PCOV.
- Point the PHP tests at `localhost:3000` after moving execution onto the runner, retaining the existing test-server service.
- Apply equivalent fixes to `.github/workflows/test.yml` and `.github/workflows/pr.yml`.
- Validate with the existing build, test, and coverage commands. Report any newly exposed client-code failure before expanding the agreed scope.

## Capabilities

### New Capabilities

- `client-ci-compatibility`: Define the CI environment and validation requirements for the Bazel, OCaml, and PHP client jobs across both test workflows. This documents an existing CI capability that has no baseline OpenSpec specification yet.

### Modified Capabilities

None; the repository has no existing capability specifications.

## Impact

- Implementation is expected to affect `.bazelversion`, `.github/workflows/test.yml`, and `.github/workflows/pr.yml`.
- CI setup gains an explicit Bazel version, updated OCaml action, and a PHP setup action; PHP test-server networking changes from container DNS to the runner's published port.
- Client APIs, supported PHP version, and client behavior remain unchanged. No new regression tests, full Bzlmod migration, workflow consolidation, or unrelated action upgrades are included.
- A green build has not yet been demonstrated with the proposed setup. The exact Bazel 7 pin will be selected during implementation through validation of the existing commands.
