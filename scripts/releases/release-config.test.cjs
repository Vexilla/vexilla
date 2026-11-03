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
const {
  managedComponents,
  publishingClients,
  assertPolicyVersion,
} = require("./release-policy.cjs");
const { validatePullRequest } = require("./pr-title.cjs");
const { applyReleaseInputs } = require("./release-inputs.cjs");
const {
  acceptedBoundary,
  acceptedSource,
  observedHistory,
  preparedInput,
  buildAdoptionPullRequests,
  verifyFirstAdoption,
} = require("./check-adoption.cjs");
const state = readReleaseState();
const boundary = "b".repeat(40);
const adoption = "a".repeat(40);
const quiet = Object.fromEntries(
  ["info", "warn", "error", "debug", "trace"].map((key) => [key, () => {}])
);
setLogger(quiet);

// Synthetic inactive cases must not depend on which production SDKs have
// completed adoption. Keep their config, manifest and switches consistent.
function dormantState() {
  const dormant = structuredClone(state);
  dormant.inventory.automation.enabled = false;
  dormant.inventory.automation.historyBoundary = null;
  dormant.config.packages = {};
  dormant.config.plugins = [];
  delete dormant.config["bootstrap-sha"];
  dormant.manifest = {};
  for (const component of [
    ...dormant.inventory.clients,
    ...dormant.inventory.internalComponents,
  ]) {
    component.release.managed = false;
    if (component.publish) {
      component.publish.enabled = false;
      component.publish.trustVerified = false;
      component.publish.preflightVerified = false;
    }
    if (component.baseline) {
      component.baseline.verified = false;
      component.baseline.ownershipVerified = false;
      component.baseline.artifactComparisonAccepted = false;
      component.baseline.historicalSourceUncertaintyAccepted = false;
    }
  }
  return dormant;
}

// Every accepted field below is synthetic fixture evidence, never production
// adoption. In particular no network authority is inferred from these booleans.
function managedState(ids = ["js", "rust"], versions = {}) {
  const ready = dormantState();
  ready.inventory.automation = { enabled: true, historyBoundary: boundary };
  ready.config["bootstrap-sha"] = boundary;
  for (const component of [
    ...ready.inventory.clients,
    ...ready.inventory.internalComponents,
  ]) {
    component.release.managed = ids.includes(
      component.id === "types" ? "js" : component.id
    );
    if (!component.release.managed) {
      continue;
    }
    const seed = component.release.managementSeed;
    ready.manifest[component.directory] = versions[component.id] || seed;
    ready.config.packages[component.directory] = {
      "release-type": component.releaseType,
      component: component.component,
      ...(component.id === "elixir"
        ? { "package-name": "vexilla_client" }
        : {}),
    };
    if (component.baseline) {
      Object.assign(component.baseline, {
        verified: true,
        sourceRevision: boundary,
        adoptionSourceRevision: adoption,
        manifestVersion: seed,
        publicTypeCompatibilityReviewed: true,
        licenseConfirmed: true,
      });
    }
  }
  if (ids.includes("js")) {
    ready.config.plugins = [
      {
        type: "linked-versions",
        groupName: "js-types",
        components: ["client-js", "client-types"],
        merge: true,
      },
    ];
  }
  return ready;
}
function mockScm(commits, current, { releases = true } = {}) {
  const historyBoundary = current.inventory.automation.historyBoundary;
  const fileContent = (name) => {
    let parsedContent = fs.readFileSync(path.join(ROOT, name), "utf8");
    const component = managedComponents(current.inventory).find((c) =>
      name.startsWith(`${c.directory}/`)
    );
    if (component && name.endsWith("package.json")) {
      const json = JSON.parse(parsedContent);
      json.version = current.manifest[component.directory];
      parsedContent = JSON.stringify(json);
    }
    return {
      parsedContent,
      content: Buffer.from(parsedContent).toString("base64"),
      sha: historyBoundary,
    };
  };
  return {
    repository: { owner: "Vexilla", repo: "vexilla", defaultBranch: "main" },
    async getFileJson(name) {
      if (name === "release-please-config.json") {
        return structuredClone(current.config);
      }
      if (name === ".release-please-manifest.json") {
        return structuredClone(current.manifest);
      }
      throw Error(`Unexpected JSON read: ${name}`);
    },
    async getFileContentsOnBranch(name) {
      return fileContent(name);
    },
    async *releaseIterator() {
      if (releases) {
        for (const component of managedComponents(current.inventory)) {
          yield {
            tagName: `${component.component}-v${
              current.manifest[component.directory]
            }`,
            sha: historyBoundary,
          };
        }
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
      yield {
        sha: historyBoundary,
        message: "chore: synthetic reviewed boundary",
        files: [],
      };
    },
    async *pullRequestIterator() {},
  };
}
async function propose(commits, current = managedState(), options) {
  const manifest = await Manifest.fromManifest(
    applyReleaseInputs(mockScm(commits, current, options), current.inventory),
    "main",
    undefined,
    undefined,
    { logger: quiet }
  );
  return manifest.buildPullRequests();
}
function versionsIn(prs) {
  return Object.fromEntries(
    prs.flatMap((pr) =>
      pr.body.releaseData.map((entry) => [
        entry.component,
        entry.version.toString(),
      ])
    )
  );
}
function applyUpdates(pr, current, nativeFile) {
  const update = pr.updates.find((update) => update.path === nativeFile);
  assert(update, `Missing ${nativeFile} update`);
  return update.updater.updateContent(
    fs.readFileSync(path.join(ROOT, nativeFile), "utf8")
  );
}

test("production generation policy is ready while registry publication remains disabled", () => {
  assert.equal(VERSION, "17.11.2");
  const lock = require("./package-lock.json");
  assert.equal(lock.packages["node_modules/release-please"].version, VERSION);
  assert.equal(
    lock.packages["node_modules/release-please"].integrity,
    state.inventory.releasePlease.packageIntegrity
  );
  assert.equal(validateConfig({ ...state, requireReady: true }).ready, true);
  assert.equal(state.inventory.automation.enabled, true);
  assert.deepEqual(publishingClients(state.inventory), []);
  const stopped = structuredClone(state);
  stopped.inventory.automation.enabled = false;
  stopped.inventory.automation.reason =
    "Reviewed generation remains globally stopped";
  assert.equal(validateConfig(stopped).ready, false);
  assert.throws(
    () => validateConfig({ ...stopped, requireReady: true }),
    /Reviewed generation remains globally stopped/
  );
});

test("actual accepted production seeds and history require the prepared breaking input to propose exactly 2.0.0", async () => {
  assert.equal(state.inventory.automation.historyBoundary, acceptedBoundary);
  assert.equal(state.config["bootstrap-sha"], acceptedBoundary);
  // Reconstruct accepted initial bookkeeping from its explicit seeds. A real
  // release PR may already advance the current manifest to 2.0.0; that must not
  // erase this first-adoption regression or make the release PR's checks fail.
  const initial = structuredClone(state);
  initial.manifest = Object.fromEntries(
    managedComponents(initial.inventory).map((component) => [
      component.directory,
      component.release.managementSeed,
    ])
  );
  assert.deepEqual(initial.manifest, {
    "clients/js": "1.0.3",
    "packages/types": "1.0.3",
    "clients/rust": "1.0.1",
  });
  for (const client of state.inventory.clients.filter(
    (c) => c.release.managed
  )) {
    assert.equal(client.baseline.adoptionSourceRevision, acceptedSource);
  }
  assert.deepEqual(
    await buildAdoptionPullRequests({
      state: initial,
      commits: observedHistory,
    }),
    [],
    "The actual docs/ci commits contain no releasable breaking input"
  );
  const proposals = await buildAdoptionPullRequests({
    state: initial,
    commits: [preparedInput, ...observedHistory],
  });
  assert.deepEqual(verifyFirstAdoption(proposals, initial), {
    "client-rust": "2.0.0",
    "client-js": "2.0.0",
    "client-types": "2.0.0",
  });
  assert.equal(proposals.length, 2);
  for (const proposal of proposals) {
    const update = proposal.updates.find(
      (entry) => entry.path === ".release-please-manifest.json"
    );
    assert(update, "Generated adoption PR must update management versions");
    const versions = JSON.parse(
      update.updater.updateContent(JSON.stringify(initial.manifest))
    );
    for (const entry of proposal.body.releaseData) {
      const component = managedComponents(state.inventory).find(
        (c) => c.component === entry.component
      );
      assert.equal(versions[component.directory], "2.0.0");
      assert(
        proposal.updates.some(
          (item) => item.path === `${component.directory}/CHANGELOG.md`
        )
      );
      const native = component.id === "rust" ? "Cargo.toml" : "package.json";
      assert.match(
        applyUpdates(proposal, state, `${component.directory}/${native}`),
        /2\.0\.0/
      );
    }
  }
  const rustProposal = proposals.find((pr) =>
    pr.body.releaseData.some((entry) => entry.component === "client-rust")
  );
  assert.match(
    applyUpdates(rustProposal, state, "clients/rust/Cargo.lock"),
    /name = "vexilla_client"\nversion = "2\.0\.0"/
  );
});

test("JS/Rust management requires no unverified inactive Elixir evidence and permits no publishers", () => {
  const ready = managedState();
  assert.equal(
    ready.inventory.clients.find((c) => c.id === "elixir").baseline.verified,
    false
  );
  assert.equal(validateConfig({ ...ready, requireReady: true }).ready, true);
  assert.deepEqual(
    managedComponents(ready.inventory)
      .map((c) => c.id)
      .sort(),
    ["js", "rust", "types"]
  );
  assert.deepEqual(publishingClients(ready.inventory), []);
  ready.inventory.automation.enabled = false;
  assert.equal(validateConfig(ready).ready, false);
});

test("zero managed SDKs is valid with no implicit packages, versions, or history", () => {
  const dormant = dormantState();
  assert.deepEqual(dormant.config.packages, {});
  assert.deepEqual(dormant.config.plugins, []);
  assert.deepEqual(dormant.manifest, {});
  assert.deepEqual(validateConfig(dormant).components, []);
});

test("partial JS/types management, mismatched versions, unmanaged publication, and dormant routes fail", () => {
  for (const id of ["js", "types"]) {
    const broken = managedState();
    [...broken.inventory.clients, ...broken.inventory.internalComponents].find(
      (c) => c.id === id
    ).release.managed = false;
    assert.throws(() => validateConfig(broken), /enter and leave management/);
  }
  const unlinked = managedState();
  unlinked.manifest["packages/types"] = "1.0.0";
  assert.throws(() => validateConfig(unlinked), /management seed|aligned/);
  const noManagement = dormantState();
  noManagement.inventory.clients[0].publish.enabled = true;
  assert.throws(() => validateConfig(noManagement), /must be managed/);
  for (const id of [
    "go",
    "python",
    "php",
    "swift",
    "kotlin",
    "csharp",
    "ocaml",
  ]) {
    const broken = dormantState();
    broken.inventory.clients.find((c) => c.id === id).release.managed = true;
    assert.throws(
      () => validateConfig(broken),
      /no implemented publishing route/
    );
  }
});

test("managed membership, linked plugin, private types, and override constraints are exact", () => {
  for (const mutate of [
    (s) => {
      delete s.config.packages["clients/js"];
    },
    (s) => {
      s.config.packages["clients/elixir"] = { component: "client-elixir" };
    },
    (s) => {
      s.manifest["clients/elixir"] = "1.0.1";
    },
    (s) => {
      s.config.plugins = [];
    },
    (s) => {
      s.inventory.internalComponents[0].publish = true;
    },
    (s) => {
      s.config["release-as"] = "2.0.0";
    },
    (s) => {
      s.config.packages["clients/js"]["initial-version"] = "2.0.0";
    },
  ]) {
    const broken = managedState();
    mutate(broken);
    assert.throws(() => validateConfig(broken));
  }
});

test("management source evidence is distinct from publisher ownership, trust, and hosted evidence", () => {
  const ready = managedState();
  const js = ready.inventory.clients.find((c) => c.id === "js");
  js.baseline.sourceRevision = null;
  assert.throws(() => validateConfig(ready), /historical source/);
  js.baseline.artifactComparisonAccepted = true;
  js.baseline.historicalSourceUncertaintyAccepted = true;
  assert.doesNotThrow(() => validateConfig(ready));
  js.publish.enabled = true;
  assert.throws(() => validateConfig(ready), /publishing authority/);
  js.baseline.ownershipVerified = true;
  assert.throws(() => validateConfig(ready), /trusted publisher/);
  js.publish.trustVerified = true;
  assert.throws(() => validateConfig(ready), /hosted preflight/);
  js.publish.preflightVerified = true;
  assert.doesNotThrow(() => validateConfig(ready));
  delete js.baseline.adoptionSourceRevision;
  assert.throws(() => validateConfig(ready), /adoption source revision/);
});

test("policy accepts independent current-line versions and rejects old/new/prerelease/build versions", () => {
  const ready = managedState(["js", "rust", "elixir"]);
  for (const [id, version] of [
    ["js", "2.1.0"],
    ["rust", "2.3.1"],
    ["elixir", "2.0.2"],
  ]) {
    const c = ready.inventory.clients.find((c) => c.id === id);
    assert.equal(assertPolicyVersion(ready.inventory, c, version), version);
    for (const invalid of ["1.9.0", "3.0.0", "2.0.0-beta.1", "2.0.0+build"]) {
      assert.throws(
        () => assertPolicyVersion(ready.inventory, c, invalid),
        /configured major 2|stable release/
      );
    }
  }
});

test("first target uses the management seed and is consumed by committed approved version state", () => {
  const ready = managedState();
  const js = ready.inventory.clients[0];
  assert.doesNotThrow(() =>
    assertPolicyVersion(ready.inventory, js, "2.0.0", {
      currentVersion: "1.0.3",
    })
  );
  assert.throws(
    () =>
      assertPolicyVersion(ready.inventory, js, "2.0.1", {
        currentVersion: "1.0.3",
      }),
    /exactly 2.0.0/
  );
  assert.doesNotThrow(() =>
    assertPolicyVersion(ready.inventory, js, "2.0.1", {
      currentVersion: "2.0.0",
    })
  );
  assert.doesNotThrow(() =>
    validateConfig(
      managedState(["js", "rust"], {
        js: "2.0.0",
        types: "2.0.0",
        rust: "2.0.0",
      })
    )
  );
  const fabricated = managedState();
  fabricated.inventory.clients[0].release.managementSeed = "2.0.0";
  fabricated.inventory.internalComponents[0].release.managementSeed = "2.0.0";
  assert.throws(() => validateConfig(fabricated), /seed must precede/);
});

test("coordinated major transition permits managed groups and rejects stale delayed Elixir adoption", () => {
  const transition = managedState(["js", "rust"], {
    js: "2.1.0",
    types: "2.1.0",
    rust: "2.3.1",
  });
  transition.inventory.versionPolicy.major = 3;
  for (const c of managedComponents(transition.inventory)) {
    c.release.firstReleaseTarget = "3.0.0";
    c.release.managementSeed = transition.manifest[c.directory];
  }
  assert.doesNotThrow(() => validateConfig(transition));
  for (const c of managedComponents(transition.inventory)) {
    assert.doesNotThrow(() =>
      assertPolicyVersion(transition.inventory, c, "3.0.0", {
        currentVersion: transition.manifest[c.directory],
      })
    );
  }
  const delayed = transition.inventory.clients.find((c) => c.id === "elixir");
  assert.equal(delayed.release.managementSeed, "1.0.1");
  delayed.release.managed = true;
  transition.manifest[delayed.directory] = "1.0.1";
  transition.config.packages[delayed.directory] = {
    component: delayed.component,
    "release-type": delayed.releaseType,
  };
  assert.throws(
    () => validateConfig(transition),
    /firstReleaseTarget is stale/
  );
  delayed.release.firstReleaseTarget = "3.0.0";
  assert.throws(
    () => validateConfig(transition),
    /seed requires a revised current-major adoption plan/
  );
  assert.equal(delayed.release.managementSeed, "1.0.1");
});

test("pinned generator proposes exactly first 2.0.0 for JS/types, Rust, and delayed Elixir, then 2.0.1", async () => {
  const current = managedState(["js", "rust", "elixir"]);
  const commits = [
    {
      message:
        "feat(sdk)!: adopt reviewed SDK changes on the shared major-2 line\n\nBREAKING CHANGE: migrate JS protected types and establish the native SDK major line.",
      files: [
        "clients/js/src/index.ts",
        "clients/rust/src/lib.rs",
        "clients/elixir/lib/client.ex",
      ],
    },
  ];
  const prs = await propose(commits, current, { releases: false });
  assert.equal(prs.length, 3);
  assert.deepEqual(versionsIn(prs), {
    "client-elixir": "2.0.0",
    "client-rust": "2.0.0",
    "client-js": "2.0.0",
    "client-types": "2.0.0",
  });
  for (const pr of prs) {
    for (const entry of pr.body.releaseData) {
      const c = managedComponents(current.inventory).find(
        (c) => c.component === entry.component
      );
      assertPolicyVersion(current.inventory, c, entry.version.toString(), {
        currentVersion: current.manifest[c.directory],
      });
      assert(
        pr.updates.some((u) => u.path === `${c.directory}/CHANGELOG.md`),
        `Missing ${c.id} changelog`
      );
      const native = {
        js: "package.json",
        types: "package.json",
        rust: "Cargo.toml",
        elixir: "mix.exs",
      }[c.id];
      assert.match(
        applyUpdates(pr, current, `${c.directory}/${native}`),
        /2\.0\.0/
      );
    }
    const managementUpdate = pr.updates.find(
      (u) => u.path === ".release-please-manifest.json"
    );
    assert(managementUpdate);
    const updatedManifest = JSON.parse(
      managementUpdate.updater.updateContent(JSON.stringify(current.manifest))
    );
    for (const entry of pr.body.releaseData) {
      const c = managedComponents(current.inventory).find(
        (c) => c.component === entry.component
      );
      assert.equal(updatedManifest[c.directory], "2.0.0");
    }
  }
  const rustPR = prs.find((pr) =>
    pr.body.releaseData.some((e) => e.component === "client-rust")
  );
  assert.match(
    applyUpdates(rustPR, current, "clients/rust/Cargo.lock"),
    /name = "vexilla_client"\nversion = "2\.0\.0"/
  );
  const next = managedState(["js", "rust", "elixir"], {
    js: "2.0.0",
    types: "2.0.0",
    rust: "2.0.0",
    elixir: "2.0.0",
  });
  const fixes = await propose(
    [
      {
        message: "fix(sdk): repair isolated consumers",
        files: commits[0].files,
      },
    ],
    next
  );
  assert.deepEqual(versionsIn(fixes), {
    "client-elixir": "2.0.1",
    "client-rust": "2.0.1",
    "client-js": "2.0.1",
    "client-types": "2.0.1",
  });
});

test("types-only feature and shared validator retain linked versions and exact native identities", async () => {
  const current = managedState(["js", "rust"], {
    js: "2.0.0",
    types: "2.0.0",
    rust: "2.0.0",
  });
  for (const [message, files, version] of [
    [
      "feat(types): add optional contract",
      ["packages/types/src/generated.ts"],
      "2.1.0",
    ],
    [
      "fix(validation): reject malformed wire input",
      ["packages/publishing/src/validation.ts"],
      "2.0.1",
    ],
  ]) {
    const prs = await propose([{ message, files }], current);
    assert.deepEqual(versionsIn(prs), {
      "client-js": version,
      "client-types": version,
    });
    assert.match(prs[0].headRefName, /groups--js-types/);
  }
});

test("delayed Elixir retains its adoption input and original boundary when JS/Rust already advanced", async () => {
  const active = managedState(["js", "rust"], {
    js: "2.0.1",
    types: "2.0.1",
    rust: "2.0.1",
  });
  const history = [
    {
      message: "feat(elixir)!: adopt accumulated native changes on SDK major 2",
      files: ["clients/elixir/lib/client.ex"],
    },
  ];
  assert.deepEqual(await propose(history, active), []);
  const delayed = managedState(["js", "rust", "elixir"], {
    js: "2.0.1",
    types: "2.0.1",
    rust: "2.0.1",
  });
  assert.equal(
    delayed.inventory.automation.historyBoundary,
    active.inventory.automation.historyBoundary
  );
  const prs = await propose(history, delayed);
  assert.deepEqual(versionsIn(prs), { "client-elixir": "2.0.0" });
  assert.equal(delayed.manifest["clients/js"], "2.0.1");
});

test("Release-As trailers fail before generator version override, including stable values", async () => {
  for (const version of ["2.0.0", "2.0.1", "2.0.0-beta.1"]) {
    await assert.rejects(
      () =>
        propose([
          {
            message: `fix(js): repair fetch\n\nRelease-As: ${version}`,
            files: ["clients/js/src/index.ts"],
          },
        ]),
      /Release-As overrides/
    );
  }
});

test("PR title relevance follows management and preserves squash breaking intent", () => {
  const current = managedState().inventory;
  const files = ["packages/types/src/index.ts"];
  assert.equal(
    validatePullRequest(
      { title: "feat(types)!: change contract", files },
      current
    ).breaking,
    true
  );
  assert.throws(
    () => validatePullRequest({ title: "Update contract", files }, current),
    /Conventional Commits/
  );
  assert.throws(
    () =>
      validatePullRequest(
        {
          title: "feat(types): change contract",
          body: "BREAKING CHANGE: API",
          files,
        },
        current
      ),
    /Put !/
  );
  assert.throws(
    () =>
      validatePullRequest(
        {
          title: "fix(types): change contract",
          body: "Release-As: 2.0.0",
          files,
        },
        current
      ),
    /overrides/
  );
  assert.equal(
    validatePullRequest(
      {
        title: "Inactive Elixir change",
        files: ["clients/elixir/lib/client.ex"],
      },
      current
    ).relevant,
    false
  );
  assert.equal(
    validatePullRequest(
      { title: "App change", files: ["apps/app/src/App.tsx"] },
      current
    ).relevant,
    false
  );
  assert.equal(
    validatePullRequest(
      {
        title: "Shared input while all inactive",
        files: ["packages/publishing/src/validation.ts"],
      },
      dormantState().inventory
    ).relevant,
    false
  );
  assert.throws(
    () =>
      validatePullRequest(
        {
          title: "Change validation",
          files: ["packages/publishing/src/validation.ts"],
        },
        current
      ),
    /Conventional Commits/
  );
});

test("publisher switches preserve all eleven contract consumers including Elixir", () => {
  const contract = JSON.parse(
    fs.readFileSync(path.join(ROOT, "contract/inventory.json"), "utf8")
  );
  assert.equal(contract.length, 11);
  assert(contract.some((c) => c.id === "elixir"));
});
