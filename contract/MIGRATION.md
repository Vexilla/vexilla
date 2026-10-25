# SDK parity migration (release draft)

This change aligns the existing v1 feature types across JS/TS, Python, Go, Rust, C#, Swift, Kotlin, PHP, Elixir, OCaml, and Lua. Dart has a separate migration. No packages are published by this implementation; maintainers must choose release versions and review the complete hosted gate before shipping.

## Rollout membership

Retain the intended saved seeds and thresholds. Upgrade services that must agree on membership to aligned SDK releases together, and compare representative instance IDs before rollout. Pin the previous complete SDK release if rollback is needed; changing a seed or adding a per-language compatibility mode does not restore one shared contract.

The shared algorithm hashes UTF-8 with FNV-1a, uses ECMAScript binary64 text for numeric IDs, preserves the fractional seeded product, and compares the bucket strictly below the threshold. Existing memberships can change:

| Input                                                                      | Earlier behavior                                                     | Aligned behavior                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| ID `232`, seed `1`, threshold `0`                                          | JS's `<=` enabled the zero bucket                                    | Disabled (`0 < 0` is false)                  |
| ID `b7e91cc5-ec76-4ec3-9c1c-075032a13a1a`, seed `0.32`, threshold `0.1905` | Truncating clients used bucket `0.19` and enabled                    | Exact bucket `0.19072000002861023`, disabled |
| Numeric ID `42`, seed `1`, threshold `0.5`                                 | Swift's reversed numeric comparison disabled; Rust rejected the path | Bucket `0.011`, enabled                      |
| `hello`, seed `0.32`, threshold `0.2`                                      | Kotlin's extra multiplier changed membership                         | Bucket `0.1513600000143051`, enabled         |

Unicode IDs now hash UTF-8 bytes consistently, including supplementary characters and embedded NULs. Composed and decomposed strings remain distinct. Numeric `42` and `42.0` hash as `42`; negative zero hashes as `0`. Numeric and textual IDs remain distinct in selective lists, and a valid type mismatch returns false. Native integral overloads reject values that cannot be represented exactly as binary64. Integer feature values still have the existing JavaScript-safe bounds.

## Scheduling and failures

Daily windows now include their endpoints. A daily window from `12:00:00.123` to `13:00:00.456` is active at both exact milliseconds and inactive one millisecond beyond either endpoint. Ascending windows stay within the day; descending windows cross midnight. Equal endpoints cover only that one millisecond. Outer dates include the final millisecond of the end date. Negative timestamps use floor division and nonnegative modulo; valid extreme timestamps do not depend on a native date library's range.

Timezone labels continue to describe the existing wire representation and do not introduce local-time or DST scheduling. Validate them with the pinned compatibility rule, including supported fixed offsets.

Wrong feature-kind operations and missing/invalid required IDs fail before scheduling fallbacks. Inactive valid boolean checks return false; inactive value access returns the supplied default. Active zero and empty strings remain actual values. Core transport failures are reported and preserve prior state; explicit safe wrappers retain their documented fallbacks.

## Validation and refreshes

Repair malformed saved data in the existing publisher repair workflow before retrying. Missing seeds, boolean/numeric-string values, fractional or unsafe integers, malformed schedules, conflicting aliases, inconsistent IDs, and incomplete environment feature sets are rejected in every ingestion path. An integral JSON number written as `42.0` remains valid for integer fields. Compatible extra fields and valid false/zero/empty data remain accepted. Do not replace missing fields with invented defaults.

Setters install owned snapshots. Mutating the supplied object afterward does not change evaluations. Successful manifest/group refreshes rebuild aliases and remove stale names; invalid/failing refreshes preserve the previous snapshot. Python client instances no longer share caches.

Go's `SetManifest` now returns an error that callers should handle. `Client.InstanceId` accepts a string, number, or nil; exported manifest/group inspection fields are copies rather than mutable cache owners. Group default models retain subtype values so direct ingestion can validate them. Rust group defaults now retain full `Feature` variants, and `set_manifest` returns a validation result. Rust provides one shared `InstanceId` representation across default/per-call paths and uses exact JSON float decoding.

## Native API changes

### Optional client diagnostics

All eleven SDKs support opt-in manifest/group fetch and installation diagnostics. The default is disabled. Events identify the operation and success/failure without exposing instance IDs, feature values, credentials, full URLs, or raw callback errors. Errors still reach the caller and failed refreshes preserve their previous snapshots. JS safe wrappers also honor the logging preference while retaining their existing fallback values.

| SDK | Enable diagnostics | Native destination |
| --- | --- | --- |
| JS/TS | `new VexillaClient(config, true)` | `console.log` / `console.warn` |
| Python | `VexillaClient(..., show_logs=True)` | `logging.getLogger("vexilla_client.client")`; configure INFO to see successful operations |
| Go | `NewClient(environment, baseURL, instanceID, true)` or `client.ShowLogs = true` | standard `log` logger |
| Rust | `VexillaClient::new(...).with_show_logs(true)` | standard error |
| C# | `new VexillaClientBase(..., showLogs: true)` | `Console.Error` |
| Swift | `VexillaClient(..., showLogs: true)` | standard error |
| Kotlin | `Client(..., showLogs = true)` | `java.util.logging` logger `dev.vexilla.Client` |
| PHP | `new Client(baseUrl, environment, instanceId, true)` | `error_log` |
| Elixir | `VexillaClient.create_config(base_url, environment, instance_id, true)` | `Logger`; configure INFO to see successful operations |
| OCaml | `make_client ~show_logs:true ... ()` | standard error |
| Lua | `Client.new({base_url = url, show_logs = true})` | standard error |

The Rust builder and additional optional arguments preserve existing constructor calls. SDK implementations use descriptive domain names and expanded control flow. Alias normalization remains the pinned publisher-compatible convention; the JS client no longer calls `case` directly for lookup aliases.

### Client models and typed APIs

C# preserves its string constructor and typed value accessors, and also accepts numeric/missing default IDs through its object constructor. `ShouldCustom` and `Value` expose the common dynamic operations. Group defaults now retain their concrete feature subtype; direct setters validate full native models. Errors expose `ContractException.Kind` (`validation`, `lookup`, `kind`, `instance`, or `fetch`).

Swift’s `setManifest` now throws, as `setFlags` already does. Decode aggregate publications with `try Manifest.decode(data:)` and `try Group.decode(data:)` instead of `JSONDecoder.decode`: Foundation otherwise merges canonically equivalent JSON keys and can round numbers differently. `StringMap` preserves byte-distinct IDs while retaining string subscripts and sequence iteration. Typed value methods remain available; the generic `value` operation supports the shared fallback behavior. Use `InstanceId` overloads for numeric or missing IDs.

Kotlin’s `VexillaCodec.decodeManifest` / `decodeGroup` validate original JSON before building models. The manifest/schedule serializers apply the same checks. Native setters still accept existing model classes, copy nested maps/lists, and throw on invalid models. Evaluation methods return `Result`; generic `shouldCustom` and `value` supplement the typed methods, and the constructor accepts numeric/missing default IDs.

PHP keeps decoded-object callbacks and additionally accepts raw JSON strings. Use `Codec::manifest` / `Codec::group` for direct JSON ingestion before typed constructors can coerce fields. `shouldCustom` and `value` supplement the existing typed methods. Scalar model fields retain their original values until validation, so weak PHP typing cannot silently repair strings or booleans into numbers. Direct setters validate and copy concrete full feature models. `ContractException::$kind` reports deliberate errors.

Elixir keeps immutable configurations: retain the configuration returned by every `set_*` / `sync_*` call. Fetched callbacks may return decoded maps or raw JSON, and all ingestion paths validate. Numeric default/per-call IDs now use the same representation as other SDKs. `VexillaContractError.kind` distinguishes validation, lookup, kind, instance, and fetch failures; a missing feature now reports lookup rather than a value-kind error.

OCaml’s `sync_flags` now returns one `Lwt_result` rather than a nested promise. Retain the returned client from both sync functions and direct setters. Fresh owned lookup tables prevent updates from mutating an older configuration. Public `get_manifest`, `set_manifest`, `get_flags`, and `set_flags` support explicit ingestion. `make_client` retains its string `instance_id` argument and accepts `custom_instance_id` for typed numeric/missing defaults. Result variants distinguish `Validation`, `Fetch`, existing lookup errors, feature-kind errors, and `Invalid_instance_id`.

These behavior and native API changes need breaking releases where package policy requires them. In particular, coordinate Swift aggregate decoding, OCaml sync result handling, Lua’s API migration, and stricter validation with application upgrades. No package versions are bumped or packages published here; release version selection and tagged artifacts remain maintainer actions.

## Lua

The source directory moves from `clients/client-lua` to `clients/lua`; the installed import stays `vexilla_client`. Replace the positional constructor, `fetch_flags("features.json")`, legacy single-file/`untagged` data, and `should(feature)` calls:

```lua
local Client = require("vexilla_client")
local client = Client.new({
  base_url = "https://flags.example.com",
  environment = "prod",
  custom_instance_id = "user-123",
})
client:sync_manifest(fetch)
client:sync_flags("Checkout", fetch)
local enabled = client:should("Checkout", "New Checkout")
local title = client:value("Checkout", "Title", "Checkout")
```

The callback receives a URL and returns a decoded v1 table. The application supplies HTTP and JSON libraries, preserves decoder nulls/array/object identity, and reports transport failures by raising an error. The core no longer requires lua-http or RapidJSON. LuaSocket 3.1.0 supplies the millisecond wall clock. Getters validate without installing, setters install, and sync methods combine the two. Sync methods return no value.

Verification covers Lua 5.1.5, 5.2.4, 5.3.6, 5.4.9, 5.5.1, and LuaJIT 2.1.1792527110, including isolated LuaRocks installations and the executable example. Lua 5.5 and LuaJIT are mandatory gate evidence. The development rockspec uses the monorepo source; a tagged release rockspec and package version must be prepared separately.

The CLI's `lua` language output returns a constants table. Prefix/suffix handling, escaped names/IDs, identifiers, and reserved words are checked with real Lua evaluation. Existing language output is unchanged.

## Unicode strings

Unpaired UTF-16 surrogate escapes such as `\ud800` are now rejected consistently in the publisher and every SDK. This explicitly authorized validation change applies to object keys, compatible extra properties, and string instance IDs as well as feature data. Check original JSON before a decoder replaces malformed text. Valid supplementary characters (including escaped surrogate pairs) and literal U+FFFD remain accepted; there is no Unicode normalization or replacement.
