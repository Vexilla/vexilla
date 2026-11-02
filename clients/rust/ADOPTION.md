# Pending major-2 adoption

The first automated Rust release targets exactly 2.0.0. Its truthful working
seed is unpublished local 1.0.1; crates.io's published baseline remains 1.0.0
from source 67480837e705ab1acf6f8ddf5f2e7c00cf7e940c. Do not silently downgrade the
manifest or invent a published 1.0.1.

The intentional common-major transition includes accumulated contract parity,
strict validation, hashing/scheduling/number handling, public API changes, the
compatibility asset, locked dependencies and the reviewed native package allowlist,
BUSL-1.1 license and isolated consumer. Minor/patch versions remain independent
from JS after adoption; the JSON wire format remains v1.

Review [the adoption checklist](../../docs/sdk-release-adoption.md) and commit
reviewed SDK inputs after the accepted fixed history boundary with a breaking
Conventional Commit title. Management, publication and final source acceptance
remain pending; this note is not a registry release.
