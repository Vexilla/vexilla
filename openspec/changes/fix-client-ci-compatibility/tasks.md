## 1. Pin Bazel

- [ ] 1.1 Add an exact Bazel 7 candidate to `.bazelversion` and verify both workflow jobs use that repository pin with their existing build, coverage, and cache configuration. Finalize the candidate only after task 4.2 succeeds.

## 2. Repair OCaml setup

- [x] 2.1 Update OCaml setup to `ocaml/setup-ocaml@v3` in both workflows and select compiler `4.14.2` to match the committed lockfile, preserving the existing dependency, build, and test commands.

## 3. Move PHP provisioning onto the runner

- [x] 3.1 Replace the PHP job container and manual apt/PECL/php.ini/Composer installation steps in both workflows with `shivammathur/setup-php@v2`, requesting PHP 7.4, compatible Composer 2, required extensions including `mbstring`, and PCOV.
- [x] 3.2 Set `TEST_SERVER_HOST=localhost:3000` for both PHP jobs while preserving the existing test-server service, port mapping, and Composer install/test commands from `clients/php`.

## 4. Validate the existing checks

- [x] 4.1 Validate workflow syntax and action inputs; review both workflow definitions together to confirm equivalent repairs and unchanged triggers, job dependencies, unaffected jobs, test-server publishing, client source, dependency lockfiles, and test assertions.
- [ ] 4.2 Run `bazel build //...` and `bazel coverage --combined_report=lcov //...` in the affected CI environment. Adjust the exact Bazel 7 pin if necessary and record the final version and successful build/coverage evidence without excluding targets.
- [ ] 4.3 Verify OCaml setup succeeds without requiring unavailable `darcs`, selects compiler 4.14.2, and completes the existing locked dependency installation, build, and test commands.
- [x] 4.4 Verify PHP 7.4, Composer, extensions, and PCOV are provisioned; confirm the existing `composer install` and `composer test` commands succeed, including the client test against `localhost:3000`.
- [ ] 4.5 Record CI run links and affected-job outcomes for both workflow definitions exercised through existing events, explicitly identifying any workflow path not executed. Report any newly exposed client-code failure with its job, command, and error before expanding scope. Add no regression test files or workflow-testing harness for these provisioning failures.

Validation details and remaining execution requirements are recorded in [validation.md](validation.md). Task 4.4 passed locally on Ubuntu 24.04; hosted workflow evidence remains part of task 4.5. The Bazel candidate is not finalized.
