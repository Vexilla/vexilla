# Pending major-2 adoption

The first automated JS/internal-types release targets exactly 2.0.0 from aligned
1.0.3 management seeds. The existing npm 1.0.3 artifact remains the historical
baseline; its exact publication commit remains unknown.

This intentional breaking transition includes strict schema-derived SDK models:
numeric schedule boundaries, manifest version `"v1"`, environment models without
editor defaults, stricter protected subclass declarations, canonical `Vexilla*`
exports, retained deprecated historical compatibility names, shared validation,
and the accumulated contract/hash/scheduling corrections. Future package metadata
and license text use the maintainer-confirmed BUSL-1.1 decision.

Review [compatibility evidence](test/package-consumer/README.md) and
[the adoption checklist](../../docs/sdk-release-adoption.md) before management or
publication. Commit these reviewed SDK inputs after the accepted boundary with a
breaking Conventional Commit title. This file records pending release scope;
it does not claim an approved adoption SHA or published 2.0.0.
