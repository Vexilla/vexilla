# Approved major-2 adoption

The maintainer approved Rust adoption on 2026-11-02. The first automated release
targets exactly 2.0.0 from unpublished local working seed 1.0.1. The crates.io
published baseline remains 1.0.0 from historical source
67480837e705ab1acf6f8ddf5f2e7c00cf7e940c; no published 1.0.1 is asserted.

The reviewed adoption source is 9bd974df2efe1693b142fed184c42785565119d7. The
approved fixed shared history boundary is
8b4d80c05abec38d953f38b6bf59ff96462939fa. The breaking adoption commit containing
this note supplies the releasable input after that boundary.

This intentional common-major transition includes accumulated contract parity,
strict validation, hashing/scheduling/number handling, public API changes, the
compatibility asset, locked dependencies, native package allowlists, BUSL-1.1
license and the isolated consumer. The maintainer accepted those accumulated
changes and the truthful unpublished seed without downgrading the manifest.
Minor/patch versions remain independent from JS after adoption; the JSON wire
format remains v1.

Release generation and registry publication remain disabled pending hosted
preflight, account/trust evidence and separate activation. See
[the adoption checklist](../../docs/sdk-release-adoption.md).
