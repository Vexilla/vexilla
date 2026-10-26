# Public npm compatibility baseline

`baseline.json` records the read-only npm registry snapshot for
`@vexilla/client@1.0.3`, its immutable tarball integrity, declaration SHA-256,
entry points, and 33 exported type names. The published artifact has a CommonJS
`dist/index.js` entry and `dist/index.d.ts` declarations, without an `exports`
map. Existing root and `@vexilla/client/dist/index` imports remain supported.

`compatibility.ts` remains unchanged and runs only with `--baseline` against
the published 1.0.3 artifact. It records all existing type exports and
representative constructor, fetch, set, evaluate, and safe API calls, including
nullable schedule dates and a `version: string` manifest annotation.

Candidates use `api.ts` and `compatibility-v2.ts`. The public SDK models use
`VexillaFeature`, `VexillaSchedule`, `VexillaManifest`, `VexillaManifestGroup`,
`VexillaGroup`, and `VexillaEnvironment`, with `Vexilla*Feature` names for feature
variants. They alias the internal schema contract. The SDK does not expose the
new `Published*` or `Wire*` names; historical `PublishedGroup` and
`PublishedEnvironment` remain deprecated alongside editor compatibility names.
`experimental` configuration remains optional.

These declarations require a 2.x migration for ordinary type annotations as
well as subclasses: schedule boundaries are numeric, manifest versions are
`"v1"`, and SDK environments do not require editor default values. Consumers
using nullable schedules or broad manifest strings must update those
annotations. Protected `manifest`, `flagGroups`, and `getActualItems` also use
the strict SDK models. Candidate fixtures check the canonical API and retained
compatibility names; they do not establish compatibility for arbitrary
protected-member overrides. The first automated JS/types release remains
**2.0.0 or higher**, pending maintainer compatibility review.

Run the checks against an already packed candidate:

```sh
node clients/js/scripts/check-package.cjs /absolute/path/candidate.tgz
node clients/js/scripts/check-package.cjs /absolute/path/client-1.0.3.tgz --baseline
```

The script installs the tarball and its declared production dependencies into a
fresh temporary consumer and npm cache, inspects package contents and workspace
leaks, compiles with strict TypeScript checking, and executes both CommonJS and
ESM runtime imports. It does not publish or change a version. Build and pack the
candidate first so that publication can use the identical verified file.

The client validates incoming data using Ajv, a declared production dependency.
Shared schema data and validators are bundled from the private workspace
packages; the installed SDK must not import either private package at runtime.

The maintainer confirmed Business Source License 1.1 (`BUSL-1.1`) for future JS
SDK releases. The candidate package metadata and bundled license now use that
confirmed license, with the license text copied from the repository root.
Historical evidence remains unchanged: published npm 1.0.3 metadata says
`BSL-1.0` and its bundled license contains MIT text. That artifact and its
immutable baseline record retain those original observations.
