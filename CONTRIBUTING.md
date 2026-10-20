# Contributing to the SDK JSON contract

SDK contributors should use this workflow to check a decoder or publishing change against the same v1 files as every other supported client.

## Source of truth

The authoritative [v1 JSON Schemas](packages/types/schema/v1/) describe the manifest, group, feature union, and schedule. [Published TypeScript types](packages/types/src/published.ts) are generated from them; editor types separately permit incomplete date selections. Run `pnpm --filter @vexilla/types generate` after a schema change, and commit the generated types. `pnpm --filter @vexilla/types check:generated` detects drift. CI checks drift **before** building or regenerating anything.

Both `group.features` and every environment's `features` map contain complete objects. V1 supports toggle, gradual, selective string/int/float, and value string/int/float. Gradual objects require an explicit finite numeric seed with `0 < seed <= 1`, including group defaults. New gradual features start with seed `0.5`; existing invalid seeds require explicit repair. Numeric features use `valueType: "number"` with `numberType: "int"` or `"float"`; string features use `valueType: "string"`.

Schedules require integer milliseconds for `start`, `end`, `startTime`, and `endTime`; zero represents an inactive default. Null dates are invalid. Keep the existing schedule enums (`""`, `global`, `environment`) and time enums (`none`, `start/end`, `daily`). Timezones must be UTC or an IANA identifier; the shared validator implements the schema's `iana-time-zone` format.

Numbers must be finite. Integer features must use JavaScript-safe integers, without fractional components. Numeric editor strings are decimal numbers, optionally with an exponent; conversion consumes the entire input. Booleans, missing values, partial strings such as `42oops`, and integer strings such as `42.5` are rejected. False, zero-valued feature data, empty strings, and empty lists remain valid. Seed zero is invalid because it collapses every instance hash to zero.

Map keys must match embedded IDs. Manifest entries must match the group files. Every environment must contain exactly the group's feature IDs and subtype discriminators. Names and IDs, including normalized lookup aliases, must be unambiguous in their scope. Environment values, seeds, and schedules may differ. Group file names must be safe and must not overwrite `manifest.json` or `config.json`.

Compatible extra fields are accepted by the schemas. The publisher emits only public fields. Changes to required fields, discriminators, or representations require compatibility review across the entire inventory; do not silently change the v1 wire format or hand-edit per-language fixtures to hide a failure.

## Generate and validate

Use Node 22 and pnpm 10.14.0 from the repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @vexilla/types check:generated
pnpm contract:generate
pnpm contract:test:producer
pnpm contract:test:gate
pnpm --filter @vexilla/client compile
pnpm --filter app build
pnpm --filter app exec playwright install chromium
pnpm --filter app test:browser
```

The [language-neutral authoring inputs, editing actions, and independent expectations](contract/) feed the production publication serializer and editing constructors. The generated corpus covers all eight subtypes, two environments, false/zero/empty values, schedule enums, ID/name lookups, known gradual membership at a 40% threshold, and a toggle-to-gradual editing regression. The reference clock is fixed in the expectations and artifact metadata; scheduled examples include an expired window and a broad active window. Existing clock-relative scheduling suites stay separate.

Generation writes `.contract-artifacts` by default. Set `VEXILLA_CONTRACT_DIR` to use a different directory; use an absolute path when invoking native tools. The directory contains `manifest.json`, group JSON, `expected.json`, and `metadata.json` with the source revision and SHA-256 hashes. Metadata and expectations are test data, separate from the public files served to SDKs. Generate once and reuse those exact bytes for every client.

## Run an SDK contract

When the Python lockfile changes, run `pnpm contract:python:requirements`; producer checks reject an export that drifts from the production lock.

Install the relevant language's dependencies, then run `pnpm contract:run <id>` from the repository root. The wrapper verifies artifact hashes, invokes the command below in its SDK directory, and writes a success receipt only after the command succeeds and artifact hashes still match.

| ID | SDK | Native command (in SDK directory) | Toolchain/dependencies |
| --- | --- | --- | --- |
| `js` | JavaScript/TypeScript | `pnpm test:contract` | Node 22; built types package |
| `python` | Python | `python -m pytest tests/test_contract.py -q` | Python 3.9; `pip install --require-hashes -r contract-requirements.txt` exports the existing lock, including production Pydantic 1.9.2 |
| `go` | Go | `go test ./pkg/vexilla -run TestSharedContract -count=1` | Go 1.23+ |
| `rust` | Rust | `cargo test --locked --lib shared_contract` | Stable Rust; committed Cargo lockfile |
| `csharp` | C# | `dotnet run --project Contract/Contract.csproj` | .NET 8; compiles the production client and converters |
| `swift` | Swift | `swift test --filter ContractTests` | Run at repository root; Swift with XCTest (Xcode on macOS, or official Swift Linux image) |
| `kotlin` | Kotlin | `./gradlew test --tests ContractTest` | Java 8; checked-in Gradle wrapper |
| `php` | PHP | `php contract/test.php` | PHP 7.4; mbstring and pcov; `composer install --no-dev` |
| `elixir` | Elixir | `mix test test/contract_test.exs` | Elixir 1.15.7, OTP 26; `mix deps.get` |
| `ocaml` | OCaml | `opam exec -- dune exec test/contract.exe` | OCaml 4.14.2; `opam install . --deps-only --with-test --yes` |

Each test uses its actual production decoding and client ingestion APIs, then checks all subtypes and normal lookups. Dart and Lua are explicitly outside the required inventory and this change's migration scope.

For local toolchain containers, the optional `VEXILLA_CONTRACT_LAUNCHER` environment variable is a JSON argv prefix for the native command. Expose only that SDK's source and the public artifacts; set the container's `VEXILLA_CONTRACT_DIR` to its mounted fixture path. Dependency installation belongs in the launcher setup. Do not regenerate or modify wire JSON inside a consumer.

`pnpm contract:serve` optionally serves the generated artifact directory on loopback port 3001 (`PORT` overrides it). This server is separate from the existing dynamic scheduling server.

## Required gate

The [explicit inventory](contract/inventory.json) contains exactly ten SDKs. PR updates and branch pushes call the contract workflow. A producer builds and tests the current revision, uploads one artifact set, and each SDK downloads that set. The aggregate gate requires successful producer/consumer job results and one matching revision/hash receipt from every required SDK. Failed, cancelled, skipped, stale, duplicate, or missing results fail the gate. A mutable `latest` test-server image supplies no evidence for this gate.

After successful local runs of all ten wrappers, inspect receipts with:

```sh
PRODUCER_RESULT=success CONSUMERS_RESULT=success pnpm contract:gate
```

These local status arguments describe work you have actually run; they are not a substitute for the hosted required CI status. Configure branch protection to require **Required SDK JSON contract** in the calling workflow. Do not mark the OpenSpec implementation complete until the hosted matrix also succeeds.

## Repairing older saved settings

Loading a configuration never invents missing rollout seeds. Publishing validates the entire approved snapshot before any hosting write, including the credential-scrubbed authoring backup. One invalid group blocks the entire batch and preserves saved settings and draft edits.

The repair dialog identifies the group, feature, optional environment, exact field path, expected value, and edit instructions. Follow **Edit affected settings** to the feature's **Group defaults** or affected environment. Enter an explicit seed and threshold for a malformed gradual object; choose numeric subtypes and dates where reported. Identity errors expose explicit buttons to use the map ID; group identifiers can be repaired under **Group identifier**. Retry publication after every issue is repaired. Choosing a new type is an explicit action that initializes new subtype defaults; it does not migrate older settings automatically. Changing a seed can change rollout membership, so retain the intended value rather than choosing one arbitrarily.

All project control-flow statements must use explicit blocks in every language. JavaScript/TypeScript braces are checked by `pnpm contract:check:blocks` in the producer CI job and by ESLint's `curly: all` rule; generated third-party Pagefind assets are excluded from that source check. The SDK corpus includes shared seed acceptance/rejection cases so permissive decoders cannot weaken the producer contract.
