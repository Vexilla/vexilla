The parity corpus describes the existing v1 behavior for all updated SDKs. Dart is excluded. Valid `manifest.json` and group files still come from the production serializer. `parity.json` contains literal hash, numeric-ID, rollout, fixed-clock schedule, validation, and lifecycle expectations; it is copied into the artifact set without generating expected results from an SDK.

Hash literals were cross-checked using Python UTF-8 bytes with arbitrary-precision integers and JavaScript `BigInt`, independently of SDK code. Schedule literals are checked against arbitrary-precision UTC interval arithmetic. Numeric text follows ECMAScript binary64 serialization (RFC 8785 section 3.2.2.3). Validation mutations are applied to the published fixture and checked against `validatePublication` before artifacts are emitted. Native nonfinite inputs use `nativeNumber` descriptors; these must be materialized without a JSON round-trip. Mutations use JSON pointers, including escaped map keys. They never repair input. Operation steps each record either `{ "value": ... }` (including null for a successful void operation) or a deliberate error category.

`compatibility.json` pins publisher alias examples and timezone compatibility data for Node 22.15.0 / ICU 76.1 and `case` 1.6.3. The identifier list was obtained from IANA zoneinfo names and aliases, filtered through that publisher's `Intl.DateTimeFormat` acceptance rule. Matching is case insensitive. UTC aliases and the separately specified fixed-offset grammar remain accepted. This data defines identifier compatibility; schedules still evaluate in UTC milliseconds. It does not add a timezone field or named-timezone evaluation.

This file is the maintained compatibility source. `pnpm contract:compat:generate` produces all eleven SDK assets: eight JSON copies and the Lua, Swift, and OCaml representations. Commit those generated assets with source changes so native SDK builds and packages remain independent of the generator. `pnpm contract:compat:check` and the producer CI compatibility step verify the same outputs without repairing stale or missing files. Generated-file attributes and formatter exclusions keep these mechanical assets out of routine formatting and review noise.

Native commands receive `VEXILLA_CONTRACT_DIR` and `VEXILLA_OBSERVATIONS_FILE`. They read the actual artifact bytes through the SDK's normal decoding/callback boundary, exercise direct ingestion too, and write this protocol only after the assertions succeed:

```json
{
  "protocol": 1,
  "sdk": "js",
  "runs": [
    {
      "runtime": "native",
      "observations": [
        { "caseId": "hash/empty", "outcome": { "value": 2166136261 } }
      ]
    }
  ]
}
```

Every case returned by `readVectors` is required exactly once per runtime, including all publication environments with ID, name, and normalized-name lookups. Lua must report a complete run for every interpreter in `lua-toolchain.json` (Lua 5.1–5.5 and LuaJIT 2.1), produced by separate native processes. Lua 5.5 and LuaJIT are mandatory; no advertised runtime may be skipped. Deliberate errors are `validation`, `lookup`, `kind`, `instance`, or `fetch`; an unrelated exception or crash must fail the process. These categories are test protocol vocabulary, not a requirement for identical public exceptions.

The wrapper checks values and error categories, exact case/runtime coverage, and artifact/metadata immutability before issuing a receipt. Exit status zero alone is insufficient. Receipts retain the checked coverage; the aggregate gate verifies it again. The gate regression suite intentionally exercises empty/skipped suites, duplicate observations, wrong values, unexpected errors, failed processes, metadata repairs, and incomplete Lua runtime evidence.

All strings and object keys, including compatible extras, must be Unicode scalar text. `wireString` mutations contain an ASCII JSON string literal so malformed surrogate tests remain representable in every corpus reader. Reject invalid UTF-8 and unpaired escapes at the public ingestion boundary before decoder replacement; valid pairs, U+FFFD, and byte-distinct composed/decomposed identifiers remain accepted.
