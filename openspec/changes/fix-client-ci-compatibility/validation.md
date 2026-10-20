## Validation on 2026-10-19

The workflow edits are implemented. Bazel and OCaml passed hosted validation. PHP provisioning exposed an existing scheduler overflow, which the user subsequently authorized fixing. The focused one-line correction and one case in the existing PHP test file pass locally on PHP 7.4.33; hosted PHP acceptance remains pending. No lockfile, existing assertion, or test target has changed, and no regression test files or workflow-testing harness were added.

### Workflow review

- Both YAML files parse successfully. Comparing their parsed structures against `HEAD` confirms that only the planned PHP container/provisioning/address changes and OCaml action/compiler changes were made. Triggers, job dependencies, services, unaffected jobs, and existing commands are preserved.
- The configured PHP and OCaml inputs match the live `v2` and `v3` action manifests, respectively.
- Actionlint 1.7.12 reports 27 pre-existing action-runtime warnings, compared with 29 baseline diagnostics. Removing the manual PHP installer resolves two ShellCheck warnings. There are no new diagnostics. A second run filtering only the pre-existing action-runtime warnings exits 0.
- Both existing Bazel jobs invoke `bazel` after checkout, and their cache keys already include `.bazelversion`. Bazelisk uses that file as its repository version source.

### Existing PHP suite: passed locally

The actual `shivammathur/setup-php@v2` entry point ran in a disposable Ubuntu 24.04 x86-64 container with the same version, extension, Composer, and coverage inputs as the workflows. The existing test-server Dockerfile supplied the integration fixtures through localhost port 3000.

- PHP: 7.4.33.
- Composer: 2.10.3, selected by `composer:v2`.
- PCOV: 1.0.12, enabled.
- All requested extensions were provisioned, including `mbstring`.
- `composer install` from `clients/php` completed against the committed lockfile.
- `TEST_SERVER_HOST=localhost:3000 composer test` completed: `OK (1 test, 17 assertions)`.

This validates the PHP provisioning and existing suite locally. The hosted PR Test result is recorded below.

### Local Bazel validation limitation

In disposable Ubuntu 22.04 x86-64 with OpenJDK 17, Bazel 7.6.1 resolved the mixed repository graph and reached compilation across the existing targets. `bazel build //...` then failed in the .NET compiler with:

```text
assertion failed [block != nullptr]: BasicBlock requested for unrecognized address
(BuilderBase.h:550 block_for_offset)
compiler_wrapper.sh: ... Trace/breakpoint trap
```

The host is Apple Silicon and Docker runs these processes through Rosetta. The symptom matches a [reported .NET/Rosetta runtime issue](https://github.com/dotnet/runtime/issues/106819); this is evidence of a local validation limitation, not proof of a client-code defect. The subsequent unchanged `bazel coverage --combined_report=lcov //...` invocation stalled and was stopped (exit 137). The successful hosted run below supplies acceptance evidence for both commands. No targets were excluded.

### Local OCaml validation limitation

The `v3` action source filters optional packages such as `darcs` through the available apt package metadata. Both workflows explicitly select 4.14.2, matching the committed lockfile. A local attempt to execute the action stopped before setup because its GitHub API client requires the token normally supplied by Actions: `Error: Parameter token or opts.auth is required`. Hosted setup subsequently succeeded, as recorded below.

### Hosted workflow evidence

The [original failing Test run](https://github.com/Vexilla/vexilla/actions/runs/39336758899) predates these changes and is not acceptance evidence. [Draft PR #61](https://github.com/Vexilla/vexilla/pull/61) triggered [PR Test run 39344712485](https://github.com/Vexilla/vexilla/actions/runs/39344712485) at commit `0a21dc8`.

- PHP passed on the hosted runner with PHP 7.4.33, Composer 2.10.3, and PCOV 1.0.12: `OK (1 test, 17 assertions)`, reaching `localhost:3000`.
- OCaml setup succeeded without requiring `darcs` and installed compiler 4.14.2. The existing locked installation then failed with exit 20: `deps-of-vexilla_sdk -> conduit-lwt-unix = 6.2.2`, `no matching version`. That version exists in the official opam archive with reason `maintenance-intent`. Both workflows now include the archive after the default repository; the follow-on hosted result below verifies the repair. The lockfile is unchanged.
- [Bazel passed](https://github.com/Vexilla/vexilla/actions/runs/39344712485/job/118374425584). Bazelisk downloaded 7.6.1 from the committed repository pin. `bazel build //...` completed successfully with 1108 actions. `bazel coverage --combined_report=lcov //...` generated `_coverage_report.dat` and reported `Executed 4 out of 4 tests: 4 tests pass.` The C#, Go internal, Go client, and Rust targets all passed.

The separate `.github/workflows/test.yml` path has not executed with this patch; its push filter does not match the slash-containing task branch. No triggers have been changed.

### Follow-on hosted run and exposed PHP scheduler bug

[PR Test run 39345385267](https://github.com/Vexilla/vexilla/actions/runs/39345385267) tests archive repair commit `2a97c01`. Bazel passed again. The [OCaml job](https://github.com/Vexilla/vexilla/actions/runs/39345385267/job/118376609349) also passed: setup installed compiler 4.14.2, the unchanged locked dependency installation installed `conduit-lwt-unix.6.2.2`, and the existing `dune build` and `dune test` commands completed successfully. Alcotest reported 2 hash tests, 5 schedule tests, and 1 client integration test successful (8 total).

All unaffected client jobs (Elixir, Kotlin, Python, and Swift) passed. The overall run failed solely because of the PHP scheduling assertion below.

The [PHP job](https://github.com/Vexilla/vexilla/actions/runs/39345385267/job/118376609326) successfully provisioned PHP and installed the committed dependencies. Its unchanged `composer test` command then failed at `clients/php/tests/ClientTest.php:67`: `Failed asserting that true is false` for `afterGlobal` (1 test, 11 assertions, 1 failure). The failure occurred at 2026-10-20 00:04:54 UTC; the same command had passed at 2026-10-19 23:58:43 UTC in the first hosted run.

Read-only investigation identified `clients/php/src/Scheduler.php` setting end-of-day microseconds to `999_999_999`. A PHP 7.4 reproduction confirms that `setTime(23, 59, 59, 999_999_999)` produces `2026-10-20 00:16:38.999999` for an end date of October 19. The valid `999_999` microsecond value produces `2026-10-19 23:59:59.999999`. Thus the existing scheduler can treat an expired previous-day schedule as active just after midnight, matching the hosted failure.

The finding was reported before making client changes. The user then authorized the focused PHP fix. PHP acceptance task 4.4 remains open until hosted validation of that correction completes. Raw reproduction output is in `php-schedule-reproduction.log` alongside the hosted logs.

### Authorized PHP scheduler correction: local verification

The scheduler now calls `endOfDay()` on the cloned UTC end date. One deterministic case in the existing `ClientTest.php` exercises the real scheduler with explicit current times: the final microsecond of the end date remains included, and the next midnight is excluded.

- Before changing the scheduler, `composer test -- --filter testScheduleExpiresAtUtcMidnight` failed at the next-midnight assertion: `Tests: 1, Assertions: 2, Failures: 1`.
- After the one-line correction, the same command passed: `OK (1 test, 2 assertions)`.
- The unchanged `composer test` command passed against the existing test server at `localhost:3000`: `OK (2 tests, 19 assertions)`.
- PHP 7.4.33 syntax checks passed for both edited PHP files. The local environment used native Linux ARM64 with the same setup-php version, extension, Composer, and PCOV inputs as the hosted jobs; hosted x86-64 validation remains pending.
- No test file was added and no existing integration assertion was changed.

Raw output: `php-scheduler-red.log`, `php-scheduler-green.log`, and `php-scheduler-suite.log` in the session evidence directory.

Hosted validation used the workflows' existing events. Task 4.4 remains open for the PHP client failure; the change is not ready to archive.

Raw local logs are in `/private/tmp/vexilla-ci-validation/` for this session.
