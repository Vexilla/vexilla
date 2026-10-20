## ADDED Requirements

### Requirement: Bazel uses an explicit compatible version

Both client test workflows SHALL use the same exact Bazel 7 release selected through the repository's `.bazelversion` file. The selected release MUST support the existing mixed `WORKSPACE` and Bzlmod dependency configuration and pass the existing build and coverage commands without excluding targets.

#### Scenario: Bazel runs on a fresh CI runner

- **WHEN** either workflow starts the Bazel job without a restored Bazel cache
- **THEN** Bazelisk selects the exact version committed in `.bazelversion`
- **AND** `bazel build //...` loads the existing language rules, including `@rules_rust`, and completes successfully
- **AND** `bazel coverage --combined_report=lcov //...` runs the existing tests successfully

### Requirement: OCaml setup matches the committed dependency lock

Both workflows SHALL use `ocaml/setup-ocaml@v3` with compiler `4.14.2`. Setup MUST tolerate unavailable optional system packages such as `darcs`. Both workflows SHALL include the official opam archive as a lower-priority source after the default repository, making archived versions in the committed lockfile available. The jobs SHALL retain the existing locked dependency installation, build, and test commands.

#### Scenario: OCaml runs on an Ubuntu runner without darcs

- **WHEN** either workflow runs OCaml setup and `darcs` has no installation candidate
- **THEN** setup completes without requiring that unavailable optional package
- **AND** the selected compiler is 4.14.2, matching `clients/ocaml/vexilla_sdk.opam.locked`
- **AND** the existing dependency installation, `opam exec -- dune build`, and `opam exec -- dune test` commands complete successfully

#### Scenario: A locked dependency has moved to the official archive

- **WHEN** a version required by the committed lockfile, such as `conduit-lwt-unix = 6.2.2`, is absent from the main opam repository
- **THEN** the dependency solver can find that version in the official opam archive
- **AND** default repository metadata takes priority when both sources provide a version
- **AND** the existing lockfile and installation commands are preserved

### Requirement: PHP setup preserves the tested runtime and dependencies

Both PHP jobs SHALL execute directly on the runner using `shivammathur/setup-php@v2` with PHP 7.4, compatible Composer 2, the extensions required by the committed dependencies and PHPUnit, and PCOV. They SHALL install dependencies from `clients/php/composer.lock` and run the existing `composer test` command from `clients/php`, without the old PHP job container or its manual package-installation commands.

#### Scenario: PHP provisioning completes before client tests

- **WHEN** either workflow starts its PHP job on a fresh runner
- **THEN** the setup action provisions PHP 7.4, Composer, required extensions including `mbstring`, and PCOV
- **AND** provisioning does not depend on the Bullseye repositories from `php:7.4.33-fpm`
- **AND** `composer install` and `composer test` complete successfully against the committed dependency lockfile

### Requirement: PHP integration tests reach the existing test server

Both PHP jobs SHALL retain the existing test-server service and its published port 3000. The jobs SHALL provide `TEST_SERVER_HOST=localhost:3000` to the existing tests when PHP executes directly on the runner.

#### Scenario: PHP client fetches integration fixtures

- **WHEN** the existing PHP client test reads `TEST_SERVER_HOST` and requests the test-server fixtures
- **THEN** its HTTP requests reach the service through `http://localhost:3000`
- **AND** the existing integration assertions execute successfully without changes to test source

### Requirement: Both workflow definitions receive equivalent repairs

The affected jobs in `.github/workflows/test.yml` and `.github/workflows/pr.yml` SHALL use equivalent Bazel version selection, OCaml action and compiler configuration, PHP provisioning, and PHP test-server addressing. The repair MUST preserve each workflow's existing triggers, job dependencies, unaffected jobs, and test-server publishing behavior.

#### Scenario: The two workflows are reviewed and exercised

- **WHEN** the CI repair is reviewed and validated through the workflows' existing supported events
- **THEN** both definitions contain equivalent environment repairs for the affected jobs
- **AND** the validation report identifies the run evidence for each exercised workflow and explicitly identifies any workflow path that has not executed

### Requirement: Existing suites provide acceptance evidence

Validation SHALL use the existing build, test, and coverage commands and preserve their targets and assertions. This CI repair MUST NOT add regression test files or a workflow-testing harness solely for the observed provisioning failures. Any newly exposed client-code failure MUST be reported with the failing job, command, and error before expanding implementation scope.

#### Scenario: The CI compatibility repair is accepted

- **WHEN** the three affected jobs complete validation under the proposed environments
- **THEN** the validation evidence shows setup succeeded and the existing suites actually executed and passed
- **AND** no existing check was disabled, target excluded, or assertion weakened to obtain those results

#### Scenario: Setup recovery exposes a client-code failure

- **WHEN** an existing test or compilation step reveals a client-code failure after provisioning succeeds
- **THEN** the failure is recorded with its job, command, and error
- **AND** client changes and additional tests are scoped separately before implementation proceeds into that expanded work

### Requirement: PHP schedules expire at the end of their UTC end date

The PHP scheduler SHALL keep an otherwise active global schedule active through 23:59:59.999999 UTC on its configured end date and SHALL consider it expired from 00:00:00 UTC on the next day. Computing the inclusive end-of-day boundary MUST NOT overflow into the following date.

#### Scenario: The final microsecond is included

- **WHEN** a global schedule ends on October 19 and the supplied current UTC time is October 19 at 23:59:59.999999
- **THEN** the schedule is active

#### Scenario: The following midnight is excluded

- **WHEN** the same schedule is evaluated at October 20 at 00:00:00 UTC
- **THEN** the schedule is expired
- **AND** this boundary is covered by one deterministic case in the existing PHP test file without changing the existing integration assertions
