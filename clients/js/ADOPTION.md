# Approved major-2 adoption

The maintainer approved JS/internal-types adoption on 2026-11-02. The first
automated linked release targets exactly 2.0.0 from aligned 1.0.3 management
seeds. Its reviewed source is 9bd974df2efe1693b142fed184c42785565119d7, and the
fixed shared history boundary is 8b4d80c05abec38d953f38b6bf59ff96462939fa.

The verified npm 1.0.3 artifact remains the historical baseline. Its five
sourcemap sources match multiple old commits; the maintainer accepted that exact
original publication provenance remains unknown. Historical sourceRevision stays
null and is separate from the reviewed adoption source above.

This intentional breaking transition includes strict schema-derived SDK models:
numeric schedule boundaries, manifest version `"v1"`, environment models without
editor defaults, stricter protected subclass declarations, canonical `Vexilla*`
exports, retained deprecated historical compatibility names, shared validation,
and accumulated contract/hash/scheduling corrections. The maintainer approved
this migration scope and confirmed BUSL-1.1 for future package metadata/license.

The breaking adoption commit containing this note provides a releasable input
after the fixed boundary. Private types share the exact version and never
publish. Registry publication and global release generation remain disabled
until hosted preflight and separately authorized activation. See
[compatibility evidence](test/package-consumer/README.md) and
[the adoption checklist](../../docs/sdk-release-adoption.md).
