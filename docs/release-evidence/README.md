# SDK preflight evidence

## Elixir readiness (2026-11-06)

[sdk-preflight-42311132598.json](sdk-preflight-42311132598.json) preserves the unchanged hosted evidence from [run 42311132598](https://github.com/Vexilla/vexilla/actions/runs/42311132598), attempt 1, at source `5a98e333e80ed5a88a76984514081e8cebd0fa32`. All 16 jobs passed: all eleven SDK contracts, their gate, and Elixir's native tests, package inspection, production consumer, documentation and final evidence checks. Downloaded receipts and actual package/docs archives were independently revalidated against the record. Its SHA256 is `6d457c8e940f039b441fe4dc8b76fe62650817cd285cb37fd9a67d1a24cc0062`; preserve the JSON bytes unchanged.

The recorded package version is the truthful pre-major working seed 1.0.1, not the intended first automated 2.0.0 or an upload candidate. Actual toolchains were Elixir 1.15.7, OTP 26, Node 24.22.2, npm 12.2.1 and Python 3.12.3. The package SHA256 is `bdf2bd28acd16f2d626468d404f3ab8bbae9140a2d447bd59390dd089e195cbd`; docs SHA256 is `777408b5b137717e6609605a1551f6cb62028995c0319eee0ada9754876253b8`. This credential-free run establishes no OIDC authentication or registry publication.

## Original JS/Rust readiness

[sdk-preflight-41549688344.json](sdk-preflight-41549688344.json) preserves the exact hosted readiness evidence from [run 41549688344](https://github.com/Vexilla/vexilla/actions/runs/41549688344), attempt 1, for source and workflow revision `136a8091bbb582b29f1386818883dfa6177c1a0b`.

The run concluded successfully. All eleven SDK contract/native consumers, the required contract gate, JS/Rust package/isolated-consumer checks and final evidence job passed. The downloaded contract receipts and actual package bytes were independently revalidated against this record. Its SHA256 is `6bac1f08b118642fcc9872fdb1b435cc1343a2e9a40b6199dadba7057b6d1515`. Preserve the JSON bytes unchanged so this digest continues to match.

The record includes every contract receipt, selected package verification receipts, actual toolchains and archive/file digests. npm was 12.2.1, JS used pnpm 10.24.0, Rust used rustc/cargo 1.99.1. Actual Node was 24.22.0 for JS and 24.22.1 for Rust because the nested test-server action resolves floating Node 24 after the initial package-job pin.

The archives identify truthful working versions JS 1.0.3 and unpublished Rust 1.0.1. The first approved release proposals target 2.0.0; final publication must rerun complete verification at each exact approved release SHA and use those fresh candidate bytes. This preflight is readiness evidence with `publicationAuthorized: false`; it proves no registry ownership, trust, OIDC authentication or publication outcome. Native archives remain in the hosted run artifacts and task attachments; this repository stores the evidence record and digests.
