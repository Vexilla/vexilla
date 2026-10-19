## Context

The `Test` workflow failed at commit `9542a9098d4212b9849b2d50c2fbac0d751c6e5a` in [run 39336758899](https://github.com/Vexilla/vexilla/actions/runs/39336758899). The checkout used for investigation matches that commit. The failures occur before client tests execute:

| Job | Observed failure | Relevant configuration |
| --- | --- | --- |
| Bazel | Bazelisk downloads Bazel 9.3.0, which cannot resolve `@rules_rust`. | No `.bazelversion` exists. Rust, .NET, and Kotlin setup still use `WORKSPACE`; `MODULE.bazel` only describes part of the dependency graph. |
| OCaml | Setup exits with `Package 'darcs' has no installation candidate`. | `ocaml/setup-ocaml@v2` runs on Ubuntu 24.04 and attempts to install `darcs` unconditionally. |
| PHP | Installing Git and unzip returns 404s for Bullseye security packages. | `php:7.4.33-fpm` uses repositories whose packages moved to Debian's archive. Composer and client tests have not run. |

The test-server publishing job and the Elixir, Kotlin, Python, and Swift jobs succeeded in that run. Equivalent affected configurations exist in both `.github/workflows/test.yml` and `.github/workflows/pr.yml`.

OCaml setup also resolves the floating `4.14` selector to 4.14.4, while `clients/ocaml/vexilla_sdk.opam.locked` requires 4.14.2. This is a potential follow-on dependency conflict, not a failure demonstrated by the run.

## Goals / Non-Goals

**Goals:**

- Restore the three affected jobs through focused CI environment changes in both workflows.
- Make the Bazel and OCaml compiler selections explicit and compatible with the current project configuration.
- Keep testing PHP 7.4 while provisioning Composer and required extensions through a setup action.
- Validate the repair with the existing build, test, and coverage commands, preserving their targets and assertions.

**Non-Goals:**

- Adding regression tests for setup failures or changing client behavior, APIs, or runtime support policy.
- Migrating all Bazel dependencies to Bzlmod, refreshing client dependency lockfiles, or upgrading unrelated actions.
- Consolidating the workflows, changing their triggers, or modifying the test-server image or publishing process.
- Fixing newly exposed client-code failures without first reporting the finding and agreeing on expanded scope.

## Decisions

### Pin an exact compatible Bazel 7 release

Use `.bazelversion` as the version source for Bazelisk in both workflows. Select an exact 7.x release during implementation by running `bazel build //...` and `bazel coverage --combined_report=lcov //...` with the current mixed dependency configuration. Record the selected version and the resulting CI evidence. Do not claim that a candidate is compatible merely because it resolves `@rules_rust`.

[Bazel 9 removed `WORKSPACE` support](https://blog.bazel.build/2026/01/20/bazel-9.html), so adjusting a single missing repository is insufficient. A complete Bzlmod migration would involve several language toolchains and exceeds this repair's scope. An exact Bazel 7 pin preserves the current dependency model. The existing cache keys already include `.bazelversion`, so the new pin participates in cache invalidation without a separate cache redesign.

### Upgrade OCaml setup and align the compiler with the lockfile

Use `ocaml/setup-ocaml@v3` and compiler `4.14.2` in both workflows. Keep the existing locked dependency installation, build, and test commands. The [v3 system-package implementation](https://raw.githubusercontent.com/ocaml/setup-ocaml/v3/packages/setup-ocaml/src/system-packages.ts) checks whether optional dependencies such as `darcs` are installable before requesting them.

Pinning an older runner would preserve the old action's assumptions. Updating the setup action addresses package availability while the explicit compiler version aligns the switch with the committed lockfile. A package-index refresh alone did not resolve the observed `darcs` failure.

### Provision PHP directly on the runner

Remove the PHP job container and replace its manual apt, PECL, php.ini, and Composer installation commands with `shivammathur/setup-php@v2`. Request PHP `7.4`, compatible Composer 2, `mbstring`, the extensions required by the locked dependencies and PHPUnit, and PCOV. Retain `composer install` against `clients/php/composer.lock` and the existing `composer test` command from `clients/php`.

The [setup action](https://github.com/shivammathur/setup-php) supports PHP 7.4, extension provisioning, Composer, and PCOV. This avoids maintaining archive repository rewrites inside the old PHP container. Raising the PHP major version would change what compatibility the job tests and is outside scope.

Keep the existing test-server service and its `3000:3000` published port. Change the PHP job's `TEST_SERVER_HOST` to `localhost:3000`, because the PHP process will execute on the runner instead of the service container network. The existing client test reads this variable, so no test-source change is needed.

### Keep repairs equivalent across the two workflows

Apply the same Bazel pin, OCaml action/compiler selection, PHP provisioning, and PHP server address to both workflows. Preserve workflow-specific triggers, dependencies, and unaffected jobs. Review both copies together without extracting a reusable workflow as part of this repair.

### Use existing suites as the acceptance evidence

Run the existing checks through GitHub Actions in the environments that previously failed. Confirm setup succeeds and the jobs actually reach and pass their existing tests. Preserve Bazel's coverage step and the existing OCaml and PHP test commands; do not disable checks or exclude targets to obtain green jobs.

The spec scenarios describe observations to make in the existing CI runs. They do not request new test files or a workflow-testing harness. If setup recovery exposes an application failure, record its job, failing command, and error before proposing additional client changes.

## Risks / Trade-offs

- **The exact compatible Bazel 7 release is not established.** → Treat selection as an implementation task and require both existing Bazel commands to pass. No retained successful run was available during investigation to recover a known-good version.
- **Other old toolchains or dependency downloads may fail after the first blocker is removed.** → Inspect the next failing command and distinguish CI provisioning failures from client-code failures before expanding scope.
- **Removing the PHP container changes service addressing and the installed extension set.** → Explicitly provision the required extensions and use `localhost:3000`; verify the existing HTTP integration test completes.
- **Duplicate workflow configuration can drift.** → Apply and review equivalent changes in both files and validate both affected job definitions.

## Migration Plan

1. Implement the Bazel pin and the OCaml and PHP setup changes in both workflows.
2. Check YAML/action inputs and inspect the diff for unintended changes to triggers, unaffected jobs, test targets, or assertions.
3. Run the affected GitHub Actions checks and record the selected versions, run links, and results from the existing commands. Validate both workflow definitions through their existing supported events when available; explicitly identify any workflow path that has not executed.
4. Report any remaining failure with its evidence before expanding the repair into client changes.

No application release or data migration is required. Rollback consists of reverting the CI configuration changes and `.bazelversion`; the original failures would remain reproducible with that configuration.

## Open Questions

- Which exact Bazel 7 release passes the existing build and coverage commands? Resolve through implementation-time validation; no additional user preference is needed.
- Do further setup or client failures become visible after recovery? The investigated run cannot answer this because those checks did not execute.
