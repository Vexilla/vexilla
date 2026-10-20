## Validation on 2026-10-19

The workflow edits are implemented. Bazel 7.6.1 is a candidate, pending successful hosted build and coverage. No client source, lockfile, test assertion, or test target has changed, and no regression test files or workflow-testing harness were added.

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

This validates the PHP provisioning and existing suite locally. Neither hosted workflow path has executed with these edits yet.

### Bazel: candidate remains unverified

In disposable Ubuntu 22.04 x86-64 with OpenJDK 17, Bazel 7.6.1 resolved the mixed repository graph and reached compilation across the existing targets. `bazel build //...` then failed in the .NET compiler with:

```text
assertion failed [block != nullptr]: BasicBlock requested for unrecognized address
(BuilderBase.h:550 block_for_offset)
compiler_wrapper.sh: ... Trace/breakpoint trap
```

The host is Apple Silicon and Docker runs these processes through Rosetta. The symptom matches a [reported .NET/Rosetta runtime issue](https://github.com/dotnet/runtime/issues/106819); this is evidence of a local validation limitation, not proof of a client-code defect. The subsequent unchanged `bazel coverage --combined_report=lcov //...` invocation stalled and was stopped (exit 137). Neither command has successful acceptance evidence. No targets were excluded.

### OCaml: runtime validation pending

The `v3` action source filters optional packages such as `darcs` through the available apt package metadata. Both workflows explicitly select 4.14.2, matching the committed lockfile. A local attempt to execute the action stopped before setup because its GitHub API client requires the token normally supplied by Actions: `Error: Parameter token or opts.auth is required`. The locked dependency installation, build, and tests have not run under the proposed setup.

### Hosted workflow evidence pending

The [original failing Test run](https://github.com/Vexilla/vexilla/actions/runs/39336758899) predates these changes and is not acceptance evidence. [Draft PR #61](https://github.com/Vexilla/vexilla/pull/61) triggered [PR Test run 39344712485](https://github.com/Vexilla/vexilla/actions/runs/39344712485) at commit `0a21dc8`.

- PHP passed on the hosted runner with PHP 7.4.33, Composer 2.10.3, and PCOV 1.0.12: `OK (1 test, 17 assertions)`, reaching `localhost:3000`.
- OCaml setup succeeded without requiring `darcs` and installed compiler 4.14.2. The existing locked installation then failed with exit 20: `deps-of-vexilla_sdk -> conduit-lwt-unix = 6.2.2`, `no matching version`. That version exists in the official opam archive with reason `maintenance-intent`. Both workflows now include the archive after the default repository; hosted validation of this follow-on provisioning repair is pending. The lockfile is unchanged.
- Bazel build and coverage results are still being collected.

The separate `.github/workflows/test.yml` path has not executed with this patch; its push filter does not match the slash-containing task branch. No triggers have been changed.

Hosted validation will use the workflows' existing events. The validation tasks remain open until the affected jobs execute successfully; the change is not ready to archive.

Raw local logs are in `/private/tmp/vexilla-ci-validation/` for this session.
