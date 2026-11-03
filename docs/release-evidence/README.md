# SDK preflight evidence

[sdk-preflight-41549688344.json](sdk-preflight-41549688344.json) preserves the exact hosted readiness evidence from [run 41549688344](https://github.com/Vexilla/vexilla/actions/runs/41549688344), attempt 1, for source and workflow revision `136a8091bbb582b29f1386818883dfa6177c1a0b`.

The run concluded successfully. All eleven SDK contract/native consumers, the required contract gate, JS/Rust package/isolated-consumer checks and final evidence job passed. The downloaded contract receipts and actual package bytes were independently revalidated against this record. Its SHA256 is `6bac1f08b118642fcc9872fdb1b435cc1343a2e9a40b6199dadba7057b6d1515`. Preserve the JSON bytes unchanged so this digest continues to match.

The record includes every contract receipt, selected package verification receipts, actual toolchains and archive/file digests. npm was 12.2.1, JS used pnpm 10.24.0, Rust used rustc/cargo 1.99.1. Actual Node was 24.22.0 for JS and 24.22.1 for Rust because the nested test-server action resolves floating Node 24 after the initial package-job pin.

The archives identify truthful working versions JS 1.0.3 and unpublished Rust 1.0.1. The first approved release proposals target 2.0.0; final publication must rerun complete verification at each exact approved release SHA and use those fresh candidate bytes. This preflight is readiness evidence with `publicationAuthorized: false`; it proves no registry ownership, trust, OIDC authentication or publication outcome. Native archives remain in the hosted run artifacts and task attachments; this repository stores the evidence record and digests.
