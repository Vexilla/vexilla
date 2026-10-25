# Contributing to the SDK JSON contract

SDK contributors should use this workflow to check a decoder or publishing change against the same v1 files as every other supported client.

## Source of truth

The authoritative [v1 JSON Schemas](packages/types/schema/v1/) describe the manifest, group, feature union, and schedule. [Published TypeScript types](packages/types/src/published.ts) are generated from them; editor types separately permit incomplete date selections. Run `pnpm --filter @vexilla/types generate` after a schema change, and commit the generated types. `pnpm --filter @vexilla/types check:generated` detects drift. CI checks drift **before** building or regenerating anything.

Both `group.features` and every environment's `features` map contain complete objects. V1 supports toggle, gradual, selective string/int/float, and value string/int/float. Gradual objects require an explicit finite numeric seed with `0 < seed <= 1`, including group defaults. New gradual features start with seed `0.5`; existing invalid seeds require explicit repair. Numeric features use `valueType: "number"` with `numberType: "int"` or `"float"`; string features use `valueType: "string"`.

Schedules require integer milliseconds for `start`, `end`, `startTime`, and `endTime`; zero represents an inactive default. Null dates are invalid. Keep the existing schedule enums (`""`, `global`, `environment`) and time enums (`none`, `start/end`, `daily`). Timezone labels follow the existing publisher format rule, including UTC aliases, IANA names, and supported fixed offsets. `contract/compatibility.json` pins compatibility data; SDK helpers must not depend on the host locale or timezone database. Labels retain UTC evaluation and do not add wall-clock/DST scheduling.

Maintain compatibility data only in `contract/compatibility.json`. Run `pnpm contract:compat:generate` to update all eleven SDK assets, then commit the source and generated files together. These assets stay in Git so each SDK can build and package with its native toolchain independently of Node and the monorepo's generation scripts. Generated-file attributes and formatter exclusions identify the copies; do not edit or format them by hand. Temporary contract artifacts and build outputs remain ignored.

`pnpm contract:compat:check` checks every generated asset without writing files and retains the existing Kotlin numeric-reference check. The producer CI compatibility step uses the same check; stale or missing assets fail with the paths and regeneration command. Generating test publications with `pnpm contract:generate` does not repair SDK assets.

Numbers must be finite. Integer features must use JavaScript-safe integers, without fractional components. Numeric editor strings are decimal numbers, optionally with an exponent; conversion consumes the entire input. Booleans, missing values, partial strings such as `42oops`, and integer strings such as `42.5` are rejected. False, zero-valued feature data, empty strings, and empty lists remain valid. Seed zero is invalid because it collapses every instance hash to zero.

Map keys must match embedded IDs. Manifest entries must match the group files. Every environment must contain exactly the group's feature IDs and subtype discriminators. Names and IDs, including normalized lookup aliases, must be unambiguous in their scope. Environment values, seeds, and schedules may differ. Group file names must be safe and must not overwrite `manifest.json` or `config.json`.

Compatible extra fields are accepted by the schemas. The publisher emits only public fields. Changes to required fields, discriminators, or representations require compatibility review across the entire inventory; do not silently change the v1 wire format or hand-edit per-language fixtures to hide a failure.

## Generate and validate

Use Node 24 and pnpm 10.24.0 from the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @vexilla/types check:generated
pnpm contract:compat:check
pnpm contract:generate
pnpm contract:test:producer
pnpm contract:test:gate
pnpm --filter @vexilla/client compile
pnpm --filter app build
pnpm --filter app exec playwright install chromium
pnpm --filter app test:browser
```

The [language-neutral corpus](contract/CORPUS.md) uses the production serializer for valid publications and independently authored literal expectations. It covers all eight subtypes, both environments, UTF-8/NUL/numeric hashes, exact binary64 buckets, equality and zero/full rollouts, fixed millisecond schedule boundaries, invalid structures and native numbers, lookups, replacement, caller mutation, isolation, and deliberate failures. Generation checks validation expectations against the existing publisher. Native regression suites run in addition to the shared vectors in each consumer job, with this checkout’s fixture server. C# uses the locked `Native.Tests/Native.Tests.csproj` entrypoint; Kotlin tests always run rather than reusing Gradle results.

Generation writes `.contract-artifacts` by default. Set `VEXILLA_CONTRACT_DIR` to use a different directory; use an absolute path when invoking native tools. The directory contains `manifest.json`, group JSON, `expected.json`, `parity.json`, `compatibility.json`, and `metadata.json` with the source revision, required case IDs, and SHA-256 hashes. Metadata and expectations are test data, separate from the public files served to SDKs. Generate once and reuse those exact bytes for every client.

## Run an SDK contract

When the Python lockfile changes, run `pnpm contract:python:requirements`; producer checks reject an export that drifts from the production lock.

Install the relevant language's dependencies, then run `pnpm contract:run <id>` from the repository root. The wrapper verifies artifact hashes, invokes the command below in its SDK directory, and compares the native observations to literal expectations and writes a receipt only after values, error categories, complete case/runtime coverage, source revision, and unchanged artifact hashes match. A zero exit code or skipped test suite is insufficient. The native protocol is documented in [CORPUS.md](contract/CORPUS.md).

| ID       | SDK                   | Native command (in SDK directory)                        | Toolchain/dependencies                                                                                                                 |
| -------- | --------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `js`     | JavaScript/TypeScript | `pnpm test:contract`                                     | Node 24; built types package                                                                                                           |
| `python` | Python                | `python -m pytest tests/test_contract.py -q`             | Python 3.9; `pip install --require-hashes -r contract-requirements.txt` exports the existing lock, including production Pydantic 1.9.2 |
| `go`     | Go                    | `go test ./pkg/vexilla -run TestSharedContract -count=1` | Go 1.23+                                                                                                                               |
| `rust`   | Rust                  | `cargo test --locked --lib shared_contract`              | Stable Rust; committed Cargo lockfile                                                                                                  |
| `csharp` | C#                    | `dotnet run --project Contract/Contract.csproj`          | .NET 8; compiles the production client and converters                                                                                  |
| `swift`  | Swift                 | `swift test --filter ContractTests`                      | Run at repository root; Swift with XCTest (Xcode on macOS, or official Swift Linux image)                                              |
| `kotlin` | Kotlin                | `./gradlew test --tests ContractTest --no-daemon`        | Java 8; checked-in Gradle wrapper                                                                                                      |
| `php`    | PHP                   | `php contract/test.php`                                  | PHP 7.4; mbstring and pcov; `composer install`                                                                                         |
| `elixir` | Elixir                | `mix test test/contract_test.exs`                        | Elixir 1.15.7, OTP 26; `mix deps.get`                                                                                                  |
| `ocaml`  | OCaml                 | `opam exec -- dune exec test/contract.exe`               | OCaml 4.14.2; `opam install . --deps-only --with-test --yes`                                                                           |
| `lua`    | Lua                   | `node test.cjs`                                          | Pinned Lua 5.1–5.5 and LuaJIT 2.1, LuaSocket 3.1.0, dkjson 2.11, LuaRocks 3.13.0; `node contract/scripts/setup-lua.cjs`                |

Each adapter must use production decoding/callbacks and public ingestion/evaluation methods, including direct setters. It may normalize native values and intentional error classes; it must not repair inputs, recompute product behavior, or treat an unexpected exception as expected rejection. Dart remains excluded. Lua runs every case in separate processes for every advertised interpreter; Lua 5.5 and LuaJIT 2.1 are mandatory even if older runtime support is changed. Its native command also installs the rock into isolated trees and executes the documented example. CLI Lua constants must load and drive SDK evaluation on every advertised runtime.

For local toolchain containers, the optional `VEXILLA_CONTRACT_LAUNCHER` environment variable is a JSON argv prefix for the native command. Expose only that SDK's source and the public artifacts; set the container's `VEXILLA_CONTRACT_DIR` to its mounted fixture path. Dependency installation belongs in the launcher setup. Do not regenerate or modify wire JSON inside a consumer.

`pnpm contract:serve` optionally serves the generated artifact directory on loopback port 3001 (`PORT` overrides it). This server is separate from the existing dynamic scheduling server.

## Required gate

The [explicit inventory](contract/inventory.json) contains exactly eleven SDKs. PR updates and branch pushes call the contract workflow. A producer builds and tests the current revision, uploads one artifact set, and each SDK downloads that set. The aggregate gate requires successful producer/consumer job results and one matching revision/hash/coverage receipt from every required SDK. Lua receipts must include all advertised runtimes; a successful interpreter cannot conceal another interpreter's failure. Failed, cancelled, skipped, stale, duplicate, or missing results fail the gate. A mutable `latest` test-server image supplies no evidence for this gate.

After successful local runs of all eleven wrappers, inspect receipts with:

```sh
PRODUCER_RESULT=success CONSUMERS_RESULT=success pnpm contract:gate
```

These local status arguments describe work you have actually run; they are not a substitute for the hosted required CI status. Configure branch protection to require **Required SDK JSON contract** in the calling workflow. Do not mark the OpenSpec implementation complete until the hosted matrix also succeeds.

## Shared evaluation and state rules

Implement opt-in client diagnostics using the native `showLogs` / `show_logs` convention. Logging is disabled by default and records fetch/install outcomes, including failed refreshes, without changing results or exceptions. Never include instance IDs, feature values, credentials, full URLs, or raw callback errors in these events. Add a native regression proving that enabled logging reports outcomes, disabled logging is silent, and failures still reach the caller.

Prefer descriptive domain-specific names and readable control flow in SDK implementations. Preserve distinctions between a group ID, an environment ID, a feature, its validated snapshot, and a lookup table. Do not compress multi-step validation or lifecycle operations merely to reduce source length. Generated compatibility data is exempt from source formatting changes.

- FNV-1a hashes UTF-8 bytes with unsigned 32-bit wraparound after each multiplication. Do not normalize string IDs. Reject malformed Unicode scalar strings in all keys, values, compatible extras, and required string instance IDs before a decoder can replace them. Valid surrogate pairs and literal U+FFFD remain accepted. Numeric IDs use finite binary64 and ECMAScript number text (RFC 8785 section 3.2.2.3); an integral overload rejects IDs that would lose identity during conversion. Integer feature-value bounds are separate.
- The gradual bucket is `((hash * seed) remainder 1000.0) / 1000.0`, with a binary64 multiplication before the remainder. Do not truncate, round, add a multiplier, or use `<=`; membership is exactly `bucket < value`. Finite thresholds outside `[0,1]` remain schema-valid.
- Selective strings match strings; finite numeric values match numerically across native integer/float overloads. Strings and numbers remain distinct. A valid mismatched type returns false; booleans are invalid IDs.
- Resolve lookups and validate the requested feature kind and required instance ID before applying a schedule fallback. Inactive boolean evaluations return false; inactive value access returns the caller's default. Toggles and values need no ID.
- With `DAY = 86400000` and `day(t) = floor(t / DAY) * DAY`, scheduled outer dates span `day(start)` through `day(end)+DAY-1`, inclusively. `start/end` adds inclusive absolute offsets. `daily` uses nonnegative modulo-day offsets with inclusive endpoints; descending windows cross midnight, and equal endpoints cover one millisecond. Use arithmetic for negative and extreme schema-valid timestamps.
- Validate before model coercion and before every installation. A setter receives an SDK-owned snapshot; later caller mutation cannot change it. Rebuild aliases on replacement, remove stale aliases and manifest-evicted groups, and keep other clients and unrelated groups independent. Getters do not install; sync methods compose get and set. Invalid or failed refreshes preserve prior state.

Compatibility corrections can change rollout membership and reject previously coerced input. Follow the migration notes in `contract/MIGRATION.md`; package publication and release version selection are separate actions.

## Repairing older saved settings

Loading a configuration never invents missing rollout seeds. Publishing validates the entire approved snapshot before any hosting write, including the credential-scrubbed authoring backup. One invalid group blocks the entire batch and preserves saved settings and draft edits.

The repair dialog identifies the group, feature, optional environment, exact field path, expected value, and edit instructions. Follow **Edit affected settings** to the feature's **Group defaults** or affected environment. Enter an explicit seed and threshold for a malformed gradual object; choose numeric subtypes and dates where reported. Identity errors expose explicit buttons to use the map ID; group identifiers can be repaired under **Group identifier**. Retry publication after every issue is repaired. Choosing a new type is an explicit action that initializes new subtype defaults; it does not migrate older settings automatically. Changing a seed can change rollout membership, so retain the intended value rather than choosing one arbitrarily.

All project control-flow statements must use explicit blocks in every language. JavaScript/TypeScript braces are checked by `pnpm contract:check:blocks` in the producer CI job and by ESLint's `curly: all` rule; generated third-party Pagefind assets are excluded from that source check. The SDK corpus includes shared seed acceptance/rejection cases so permissive decoders cannot weaken the producer contract.
