"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Manifest, VERSION, setLogger } = require("release-please");
const {
  ROOT,
  readReleaseState,
  validateConfig,
} = require("./check-release-config.cjs");
const { validatePullRequest } = require("./pr-title.cjs");
const { applyReleaseInputs } = require("./release-inputs.cjs");
const {
  assertStablePullRequests,
  assertReleaseCandidates,
  publicationCandidates,
} = require("./orchestrate.cjs");

const quiet = Object.fromEntries(
  ["info", "warn", "error", "debug", "trace"].map((key) => [key, () => {}])
);
setLogger(quiet);
const state = readReleaseState();
const boundary = "b".repeat(40);
// These are synthetic test baselines, never production adoption values.
const baseline = {
  "clients/js": "1.2.3",
  "packages/types": "1.2.3",
  "clients/elixir": "2.3.4",
  "clients/rust": "3.4.5",
};
const components = [
  ...state.inventory.clients.filter((c) => c.enabled),
  ...state.inventory.internalComponents,
];

function mockScm(commits, config = state.config, versions = baseline) {
  const fileContent = (name) => {
    const parsedContent = fs.readFileSync(path.join(ROOT, name), "utf8");
    return {
      parsedContent,
      content: Buffer.from(parsedContent).toString("base64"),
      sha: boundary,
    };
  };
  return {
    repository: { owner: "Vexilla", repo: "vexilla", defaultBranch: "main" },
    async getFileJson(name) {
      if (name === "release-please-config.json") {
        return structuredClone(config);
      }
      if (name === ".release-please-manifest.json") {
        return structuredClone(versions);
      }
      throw new Error(`Unexpected JSON read: ${name}`);
    },
    async getFileContentsOnBranch(name) {
      return fileContent(name);
    },
    async *releaseIterator() {
      for (const component of components) {
        yield {
          tagName: `${component.component}-v${versions[component.directory]}`,
          sha: boundary,
        };
      }
    },
    async *tagIterator() {},
    async *mergeCommitIterator() {
      for (let index = 0; index < commits.length; index++) {
        yield {
          sha: (index + 1).toString(16).padStart(40, "0"),
          ...commits[index],
        };
      }
      yield { sha: boundary, message: "chore: synthetic baseline", files: [] };
    },
    async *pullRequestIterator() {},
    // Fixtures intentionally provide no mutation methods or network client.
  };
}

async function propose(commits, config = state.config) {
  const scm = applyReleaseInputs(mockScm(commits, config));
  const manifest = await Manifest.fromManifest(
    scm,
    "main",
    undefined,
    undefined,
    { logger: quiet }
  );
  const pullRequests = await manifest.buildPullRequests();
  return pullRequests;
}

function versionsIn(pr) {
  return Object.fromEntries(
    pr.body.releaseData.map((entry) => [
      entry.component,
      entry.version.toString(),
    ])
  );
}

test("fixtures use the same exact published Release Please build as production", () => {
  assert.equal(VERSION, "17.11.2");
  const lock = require("./package-lock.json");
  assert.equal(lock.packages["node_modules/release-please"].version, VERSION);
  assert.equal(
    lock.packages["node_modules/release-please"].integrity,
    state.inventory.releasePlease.packageIntegrity
  );
  assert.equal(validateConfig(state).ready, false);
  assert.throws(
    () => validateConfig({ ...state, requireReady: true }),
    /Registry observations/
  );
});

test("types-only breaking change produces one linked JS/types major PR", async () => {
  const prs = await propose([
    {
      message: "feat(types)!: change published contract",
      files: ["packages/types/src/generated.ts"],
    },
  ]);
  assert.equal(prs.length, 1);
  assert.deepEqual(versionsIn(prs[0]), {
    "client-js": "2.0.0",
    "client-types": "2.0.0",
  });
  assert.match(prs[0].headRefName, /groups--js-types/);
  const update = prs[0].updates.find(
    (update) => update.path === ".release-please-manifest.json"
  );
  const manifest = JSON.parse(
    update.updater.updateContent(JSON.stringify(baseline))
  );
  assert.equal(manifest["clients/js"], "2.0.0");
  assert.equal(manifest["packages/types"], "2.0.0");
  assertStablePullRequests(prs);
});

test("JS-only patch links types and updates both native package versions", async () => {
  const prs = await propose([
    {
      message: "fix(js): handle missing group",
      files: ["clients/js/src/index.ts"],
    },
  ]);
  assert.equal(prs.length, 1);
  assert.deepEqual(versionsIn(prs[0]), {
    "client-js": "1.2.4",
    "client-types": "1.2.4",
  });
  for (const directory of ["clients/js", "packages/types"]) {
    const file = `${directory}/package.json`;
    const update = prs[0].updates.find((update) => update.path === file);
    assert(update, `Missing ${file} update`);
    const next = JSON.parse(
      update.updater.updateContent(
        fs.readFileSync(path.join(ROOT, file), "utf8")
      )
    );
    assert.equal(next.version, "1.2.4");
  }
});

test("shared validator fixes and breaking changes request linked JS/types releases", async () => {
  for (const [message, expected] of [
    ["fix(validation): reject invalid group data", "1.2.4"],
    ["feat(validation)!: change accepted wire data", "2.0.0"],
  ]) {
    const files = Object.freeze(["packages/publishing/src/validation.ts"]);
    const prs = await propose([Object.freeze({ message, files })]);
    assert.equal(prs.length, 1);
    assert.deepEqual(versionsIn(prs[0]), {
      "client-js": expected,
      "client-types": expected,
    });
    assert.match(prs[0].headRefName, /groups--js-types/);
    assert.deepEqual(files, ["packages/publishing/src/validation.ts"]);
  }
});

test("highest impact in either linked component selects the shared version", async () => {
  const prs = await propose([
    { message: "fix(js): repair fetch", files: ["clients/js/src/index.ts"] },
    {
      message: "feat(types): add contract field",
      files: ["packages/types/src/generated.ts"],
    },
  ]);
  assert.deepEqual(versionsIn(prs[0]), {
    "client-js": "1.3.0",
    "client-types": "1.3.0",
  });
});

test("Rust-only feature uses native Cargo strategy and independent tag identity", async () => {
  const prs = await propose([
    {
      message: "feat(rust): add client setting",
      files: ["clients/rust/src/lib.rs"],
    },
  ]);
  assert.equal(prs.length, 1);
  assert.deepEqual(versionsIn(prs[0]), { "client-rust": "3.5.0" });
  assert.match(prs[0].headRefName, /components--client-rust/);
  const update = prs[0].updates.find(
    (update) => update.path === "clients/rust/Cargo.toml"
  );
  const next = update.updater.updateContent(
    fs.readFileSync(path.join(ROOT, update.path), "utf8")
  );
  assert.match(next, /version = "3\.5\.0"/);
  assert(
    prs[0].updates.some((update) => update.path === "clients/rust/Cargo.lock")
  );
});

test("Elixir-only fix uses native mix.exs strategy independently", async () => {
  const prs = await propose([
    {
      message: "fix(elixir): repair fetch",
      files: ["clients/elixir/lib/client.ex"],
    },
  ]);
  assert.equal(prs.length, 1);
  assert.deepEqual(versionsIn(prs[0]), { "client-elixir": "2.3.5" });
  assert.match(prs[0].headRefName, /components--client-elixir/);
  const update = prs[0].updates.find(
    (update) => update.path === "clients/elixir/mix.exs"
  );
  assert.match(
    update.updater.updateContent(
      fs.readFileSync(path.join(ROOT, update.path), "utf8")
    ),
    /version: "2\.3\.5"/
  );
});

test("simultaneous changes make three independent PRs with four unique components", async () => {
  const prs = await propose([
    {
      message: "feat: extend SDKs",
      files: [
        "clients/js/src/index.ts",
        "clients/elixir/lib/client.ex",
        "clients/rust/src/lib.rs",
      ],
    },
  ]);
  assert.equal(prs.length, 3);
  const versions = Object.assign({}, ...prs.map(versionsIn));
  assert.deepEqual(versions, {
    "client-elixir": "2.4.0",
    "client-rust": "3.5.0",
    "client-js": "1.3.0",
    "client-types": "1.3.0",
  });
  assert.equal(new Set(prs.map((pr) => pr.headRefName)).size, 3);
});

test("app/serialization-only commits and dormant SDKs do not request releases", async () => {
  for (const files of [
    ["apps/app/src/App.tsx", "packages/publishing/src/index.ts"],
    ["packages/publishing/src/editing.ts", "packages/publishing/src/types.ts"],
    state.inventory.clients
      .filter((client) => !client.enabled)
      .map((client) => `${client.directory}/README.md`),
    ["clients/lua/vexilla_client.lua", "clients/client-dart/lib/main.dart"],
  ]) {
    assert.equal(
      (await propose([{ message: "feat!: change implementation", files }]))
        .length,
      0
    );
  }
});

test("ordinary docs/chore commits do not independently request SDK releases", async () => {
  for (const message of [
    "docs(js): explain configuration",
    "chore(types): tidy formatting",
  ]) {
    assert.equal(
      (
        await propose([
          {
            message,
            files: ["clients/js/README.md", "packages/types/src/index.ts"],
          },
        ])
      ).length,
      0
    );
  }
});

test("later commits update the open group PR without merging or publishing", async () => {
  const commits = [
    { message: "fix(js): repair fetch", files: ["clients/js/src/index.ts"] },
  ];
  const scm = applyReleaseInputs(mockScm(commits));
  let open;
  let creations = 0;
  let updates = 0;
  scm.pullRequestIterator = async function* (_branch, status) {
    if (status === "OPEN" && open) {
      yield open;
    }
  };
  scm.createPullRequest = async (pr) => {
    creations++;
    open = { ...pr, number: 42 };
    return open;
  };
  scm.updatePullRequest = async (number, pr) => {
    updates++;
    assert.equal(number, 42);
    open = { ...open, title: pr.title.toString(), body: pr.body.toString() };
    return open;
  };
  let manifest = await Manifest.fromManifest(
    scm,
    "main",
    undefined,
    undefined,
    { logger: quiet }
  );
  await manifest.createPullRequests();
  assert.equal(creations, 1);
  assert.match(open.body, /1\.2\.4/);
  commits.unshift({
    message: "feat(types): add new contract",
    files: ["packages/types/src/generated.ts"],
  });
  manifest = await Manifest.fromManifest(scm, "main", undefined, undefined, {
    logger: quiet,
  });
  await manifest.createPullRequests();
  assert.equal(creations, 1);
  assert.equal(updates, 1);
  assert.match(open.body, /1\.3\.0/);
  // No merge/release/registry mutation methods are supplied by the fake SCM.
});

test("prerelease Release-As trailer is rejected before release PR creation", async () => {
  const prs = await propose([
    {
      message: "fix(js): repair fetch\n\nRelease-As: 2.0.0-beta.1",
      files: ["clients/js/src/index.ts"],
    },
  ]);
  assert.throws(
    () => assertStablePullRequests(prs),
    /Unsupported release PR version/
  );
});

test("configuration excludes dormant clients and rejects overrides/downgrades", () => {
  const unparseable = structuredClone(state);
  delete unparseable.config["group-pull-request-title-pattern"];
  assert.throws(() => validateConfig(unparseable), /titles must roundtrip/);
  const invalid = structuredClone(state);
  invalid.config.packages["clients/go"] = {
    "release-type": "go",
    component: "client-go",
  };
  assert.throws(() => validateConfig(invalid), /Disabled clients/);
  const prerelease = structuredClone(state);
  prerelease.manifest["clients/rust"] = "2.0.0-rc.1";
  assert.throws(
    () => validateConfig(prerelease),
    /Unsupported manifest version/
  );
  const unlinked = structuredClone(state);
  unlinked.manifest = { "clients/js": "1.0.3", "packages/types": "1.0.0" };
  assert.throws(() => validateConfig(unlinked), /must start aligned/);
});

test("verified adoption requires ownership/source/history and allows later versions without downgrades", () => {
  const ready = structuredClone(state);
  ready.inventory.automation = { enabled: true, historyBoundary: boundary };
  ready.config["bootstrap-sha"] = boundary;
  ready.manifest = structuredClone(baseline);
  for (const client of ready.inventory.clients.filter((c) => c.enabled)) {
    client.baseline = {
      ...client.baseline,
      verified: true,
      ownershipVerified: true,
      publicTypeCompatibilityReviewed: true,
      licenseConfirmed: true,
      sourceRevision: boundary,
      registryVersion: baseline[client.directory],
      manifestVersion: baseline[client.directory],
    };
  }
  assert.equal(validateConfig({ ...ready, requireReady: true }).ready, true);
  const advanced = structuredClone(ready);
  advanced.manifest["clients/js"] = advanced.manifest["packages/types"] =
    "2.0.0";
  assert.equal(validateConfig({ ...advanced, requireReady: true }).ready, true);
  const downgrade = structuredClone(ready);
  downgrade.manifest["clients/rust"] = "1.0.0";
  assert.throws(
    () => validateConfig({ ...downgrade, requireReady: true }),
    /would downgrade/
  );
  const unauthorized = structuredClone(ready);
  unauthorized.inventory.clients[0].baseline.ownershipVerified = false;
  assert.throws(
    () => validateConfig({ ...unauthorized, requireReady: true }),
    /publishing authority/
  );
  const compatibilityPending = structuredClone(ready);
  compatibilityPending.inventory.clients[0].baseline.publicTypeCompatibilityReviewed = false;
  assert.throws(
    () => validateConfig({ ...compatibilityPending, requireReady: true }),
    /public type compatibility/
  );
  const licensePending = structuredClone(ready);
  licensePending.inventory.clients[0].baseline.licenseConfirmed = false;
  assert.throws(
    () => validateConfig({ ...licensePending, requireReady: true }),
    /license intent/
  );
  const noHistory = structuredClone(ready);
  noHistory.inventory.automation.historyBoundary = null;
  assert.throws(
    () => validateConfig({ ...noHistory, requireReady: true }),
    /history boundary/
  );
});

test("first automated JS release rejects 1.0.4 and accepts reviewed major 2.0.0", async () => {
  const adoption = {
    ...state,
    manifest: { ...baseline, "clients/js": "1.0.3", "packages/types": "1.0.3" },
  };
  for (const version of ["1.0.4", "2.0.0"]) {
    const prs = await propose([
      {
        message: `fix(js): change types\n\nRelease-As: ${version}`,
        files: ["clients/js/src/index.ts"],
      },
    ]);
    if (version === "1.0.4") {
      assert.throws(
        () => assertStablePullRequests(prs, adoption),
        /below required minimum 2.0.0/
      );
      assert.throws(
        () =>
          publicationCandidates(
            [
              {
                path: "clients/js",
                version,
                tagName: `client-js-v${version}`,
                sha: boundary,
              },
            ],
            state.inventory
          ),
        /below required minimum/
      );
    } else {
      assert.doesNotThrow(() => assertStablePullRequests(prs, adoption));
      assert.equal(
        publicationCandidates(
          [
            {
              path: "clients/js",
              version,
              tagName: `client-js-v${version}`,
              sha: boundary,
            },
          ],
          state.inventory
        ).length,
        1
      );
    }
  }
});

test("prospective PR versions must advance beyond the current manifest, including stable Release-As", async () => {
  const current = {
    ...state,
    manifest: { ...baseline, "clients/rust": "1.5.0" },
  };
  for (const version of ["1.0.2", "1.5.0", "1.5.1"]) {
    const prs = await propose([
      {
        message: `fix(rust): repair fetch\n\nRelease-As: ${version}`,
        files: ["clients/rust/src/lib.rs"],
      },
    ]);
    if (version === "1.5.1") {
      assert.doesNotThrow(() => assertStablePullRequests(prs, current));
    } else {
      assert.throws(
        () => assertStablePullRequests(prs, current),
        /must advance beyond current manifest 1.5.0/
      );
    }
  }
});

test("approved tags require the current manifest version and the JS automated floor before creation", () => {
  const makeRelease = (sdk, version) => {
    const component = state.inventory.clients.find(
      (client) => client.id === sdk
    );
    return {
      path: component.directory,
      tag: {
        version: { toString: () => version },
        toString: () => `${component.component}-v${version}`,
      },
      sha: boundary,
      pullRequest: {
        baseBranchName: "main",
        sha: boundary,
        number: 42,
      },
    };
  };
  assert.throws(
    () =>
      assertReleaseCandidates([makeRelease("js", "1.0.4")], state.inventory, {
        "clients/js": "1.0.4",
      }),
    /below required minimum/
  );
  assert.doesNotThrow(() =>
    assertReleaseCandidates([makeRelease("js", "2.0.0")], state.inventory, {
      "clients/js": "2.0.0",
    })
  );
  assert.throws(
    () =>
      assertReleaseCandidates([makeRelease("rust", "1.0.2")], state.inventory, {
        "clients/rust": "1.5.0",
      }),
    /must match the checked-out release manifest/
  );
  assert.doesNotThrow(() =>
    assertReleaseCandidates([makeRelease("rust", "1.5.0")], state.inventory, {
      "clients/rust": "1.5.0",
    })
  );
});

test("internal types never become a registry candidate", () => {
  const release = {
    path: "packages/types",
    version: "2.0.0",
    tagName: "client-types-v2.0.0",
    sha: boundary,
  };
  assert.deepEqual(publicationCandidates([release], state.inventory), []);
  assert.deepEqual(
    publicationCandidates(
      [{ ...release, path: "clients/js", tagName: "client-js-v2.0.0" }],
      state.inventory
    ),
    [{ sdk: "js", tag: "client-js-v2.0.0", revision: boundary }]
  );
});

test("relevant PR squash titles preserve release intent and reject unsafe overrides", () => {
  const files = ["packages/types/src/index.ts"];
  assert.equal(
    validatePullRequest({ title: "feat(types)!: change contract", files })
      .breaking,
    true
  );
  assert.throws(
    () => validatePullRequest({ title: "Update contract", files }),
    /Conventional Commits/
  );
  assert.throws(
    () =>
      validatePullRequest({
        title: "feat(types): change contract",
        body: "BREAKING CHANGE: changed type",
        files,
      }),
    /Put !/
  );
  assert.throws(
    () =>
      validatePullRequest({
        title: "fix(types): change contract",
        body: "Release-As: 2.0.0-beta",
        files,
      }),
    /overrides/
  );
  assert.equal(
    validatePullRequest({
      title: "Application change",
      files: ["apps/app/src/App.tsx"],
    }).relevant,
    false
  );
  const shared = ["packages/publishing/src/validation.ts"];
  assert.equal(
    validatePullRequest({
      title: "feat(validation)!: change accepted wire data",
      files: shared,
    }).breaking,
    true
  );
  assert.throws(
    () => validatePullRequest({ title: "Change validation", files: shared }),
    /Conventional Commits/
  );
  assert.equal(
    validatePullRequest({
      title: "Update publication editor",
      files: [
        "packages/publishing/src/index.ts",
        "packages/publishing/src/editing.ts",
      ],
    }).relevant,
    false
  );
});
