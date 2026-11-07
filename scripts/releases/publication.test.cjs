const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  clientFor,
  parseTag,
  validateApproval,
  verifyRelease,
} = require("./release-identity.cjs");
const { selectCandidates } = require("./select-candidates.cjs");
const {
  digest,
  checkCandidate,
  verifiedPackageFiles,
} = require("./candidate.cjs");
const { registryState, publish: publishNpm } = require("./publish-npm.cjs");
const publish = (candidate, directory, request, upload) =>
  publishNpm(candidate, directory, request, upload, async () => {});
const {
  currentPolicy,
  authorizePolicy,
  authorizeCurrent,
} = require("./current-policy.cjs");
const {
  readReleaseState,
  validateConfig,
} = require("./check-release-config.cjs");
const sha = "a".repeat(40);
const policySha = "b".repeat(40);
function policyFixture() {
  const state = structuredClone(readReleaseState());
  state.config.packages = {};
  state.manifest = {};
  state.inventory.automation = { enabled: true, historyBoundary: policySha };
  state.config["bootstrap-sha"] = policySha;
  for (const component of [
    ...state.inventory.clients,
    ...state.inventory.internalComponents,
  ]) {
    component.release.managed = ["js", "types", "rust"].includes(component.id);
    if (component.publish) {
      component.publish.enabled = false;
    }
    if (!component.release.managed) {
      continue;
    }
    state.manifest[component.directory] = "2.0.0";
    state.config.packages[component.directory] = {
      "release-type": component.releaseType,
      component: component.component,
    };
    if (component.baseline) {
      Object.assign(component.baseline, {
        verified: true,
        ownershipVerified: true,
        sourceRevision: sha,
        adoptionSourceRevision: sha,
        manifestVersion: component.release.managementSeed,
        publicTypeCompatibilityReviewed: true,
        licenseConfirmed: true,
      });
    }
    if (component.publish) {
      Object.assign(component.publish, {
        enabled: true,
        trustVerified: true,
        preflightVerified: true,
      });
    }
  }
  state.config.plugins = [
    {
      type: "linked-versions",
      groupName: "js-types",
      components: ["client-js", "client-types"],
      merge: true,
    },
  ];
  return { ...state, policyRevision: policySha };
}
const policy = policyFixture();
const inventory = policy.inventory;
const client = inventory.clients.find((c) => c.id === "js");
const tag = "client-js-v2.0.0";
const release = { id: 10, tag_name: tag, draft: false, prerelease: false };
const pr = {
  number: 20,
  merged_at: "now",
  merge_commit_sha: sha,
  user: { login: "release[bot]" },
  base: { ref: "main", repo: { full_name: "Vexilla/vexilla" } },
  head: {
    ref: "release-please--branches--main--components--js-types",
    repo: { full_name: "Vexilla/vexilla" },
  },
  labels: [{ name: "autorelease: tagged" }],
  merged_by: { login: "maintainer" },
};
const files = ["clients/js/package.json", ".release-please-manifest.json"];
const approved = (p = pr, r = release, s = sha) => ({
  ...validateApproval(client, tag, s, r, p, files, "write", "release[bot]"),
  sourceRevision: s,
  policyRevision: policySha,
});
test("approved stable component identity passes", () =>
  assert.equal(approved().version, "2.0.0"));
for (const ref of [
  "main",
  sha,
  "client-js-v1.2.3-beta.1",
  "client-js-v01.2.3",
  "client-rust-v2.0.0",
  "client-js-v2.0.0+build",
]) {
  test("reject arbitrary or unstable ref " + ref, () =>
    assert.throws(() => parseTag(client, ref))
  );
}
test("disabled SDKs cannot enter automatic or recovery dispatch", () => {
  assert.throws(() => clientFor(inventory, "python"));
  assert.throws(() =>
    selectCandidates(inventory, [], "python", "client-python-v1.0.0")
  );
  assert.throws(() =>
    selectCandidates(inventory, [
      { sdk: "python", tag: "client-python-v1.0.0", revision: sha },
    ])
  );
});
test("automatic candidates use only emitted groups and require exact revisions", () => {
  assert.deepEqual(selectCandidates(inventory, []), []);
  assert.equal(
    selectCandidates(inventory, [{ sdk: "js", tag, revision: sha }]).length,
    1
  );
  assert.throws(() =>
    selectCandidates(inventory, [{ sdk: "js", tag, revision: "main" }])
  );
  assert.throws(() =>
    selectCandidates(inventory, [
      { sdk: "js", tag, revision: sha },
      { sdk: "js", tag, revision: sha },
    ])
  );
});
for (const update of [
  { merged_at: null },
  { merge_commit_sha: "b".repeat(40) },
  { base: { ref: "other" } },
  { head: { ref: "feature" } },
  { labels: [] },
  { user: { login: "untrusted" } },
]) {
  test("reject unapproved release PR " + JSON.stringify(update), () =>
    assert.throws(() => approved({ ...pr, ...update }))
  );
}
test("reject prerelease/draft and nonmaintainer merge before credentials", () => {
  assert.throws(() => approved(pr, { ...release, prerelease: true }));
  assert.throws(() => approved(pr, { ...release, draft: true }));
  assert.throws(() =>
    validateApproval(
      client,
      tag,
      sha,
      release,
      pr,
      files,
      "read",
      "release[bot]"
    )
  );
  assert.throws(() =>
    validateApproval(client, tag, sha, release, pr, files, "write", "")
  );
});
test("release resolves immutable manifest even if main advances", async () => {
  const routes = [];
  const request = async (route) => {
    routes.push(route);
    if (route.includes("/releases/tags/")) {
      return release;
    }
    if (route.includes("/git/ref/")) {
      return { object: { type: "commit", sha } };
    }
    if (route.includes("/commits/")) {
      return [pr];
    }
    if (route.includes("/files?")) {
      return files.map((filename) => ({ filename }));
    }
    if (route.endsWith("/pulls/20")) {
      return pr;
    }
    if (route.includes("/permission")) {
      return { permission: "maintain" };
    }
    if (route.includes("/compare/")) {
      return { status: "ahead" };
    }
    if (route.includes("/contents/.github/sdk-release-inventory.json")) {
      const historical = structuredClone(inventory);
      historical.clients.find((c) => c.id === "js").publish.enabled = false;
      return {
        encoding: "base64",
        content: Buffer.from(JSON.stringify(historical)).toString("base64"),
      };
    }
    if (route.includes("/contents/.release-please-manifest.json")) {
      return {
        encoding: "base64",
        content: Buffer.from(
          JSON.stringify({ "clients/js": "2.0.0", "packages/types": "2.0.0" })
        ).toString("base64"),
      };
    }
    if (route.includes("/contents/")) {
      return {
        encoding: "base64",
        content: Buffer.from(
          JSON.stringify({ name: "@vexilla/client", version: "2.0.0" })
        ).toString("base64"),
      };
    }
    throw Error(route);
  };
  const identity = await verifyRelease(
    inventory,
    "js",
    tag,
    sha,
    request,
    "release[bot]",
    policySha
  );
  assert.equal(identity.revision, sha);
  assert(
    routes
      .filter((r) => r.includes("/contents/"))
      .every((r) => r.endsWith("?ref=" + sha))
  );
  await assert.rejects(() =>
    verifyRelease(
      inventory,
      "js",
      tag,
      "b".repeat(40),
      request,
      "release[bot]",
      policySha
    )
  );
  await assert.rejects(
    () =>
      verifyRelease(
        inventory,
        "js",
        tag,
        sha,
        async (route) => {
          if (route.includes("/contents/.release-please-manifest.json")) {
            return {
              encoding: "base64",
              content: Buffer.from(
                JSON.stringify({
                  "clients/js": "2.0.1",
                  "packages/types": "2.0.0",
                })
              ).toString("base64"),
            };
          }
          return request(route);
        },
        "release[bot]",
        policySha
      ),
    /managed version manifest disagree/
  );
});
function candidateFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sdk-candidate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const bytes = Buffer.from("verified package");
  fs.writeFileSync(path.join(dir, "client.tgz"), bytes);
  const identity = approved();
  const candidate = {
    ...identity,
    kind: "sdk-release-candidate",
    artifact: "client.tgz",
    verification: { package: true, consumer: true, native: true },
    files: [{ name: "client.tgz", sha256: digest(bytes) }],
  };
  return { dir, bytes, identity, candidate };
}
test("modified artifact, wrong revision, missing verification fail", (t) => {
  const { dir, identity, candidate } = candidateFixture(t);
  checkCandidate(candidate, identity, dir, inventory);
  assert.throws(() =>
    checkCandidate(
      { ...candidate, revision: "b".repeat(40) },
      identity,
      dir,
      inventory
    )
  );
  assert.throws(() =>
    checkCandidate(
      { ...candidate, verification: { package: true } },
      identity,
      dir,
      inventory
    )
  );
  fs.writeFileSync(path.join(dir, "client.tgz"), "changed");
  assert.throws(() => checkCandidate(candidate, identity, dir, inventory));
});
const response = (status, data) => ({
  status,
  ok: status === 200,
  json: async () => data,
});
const matching = (candidate, bytes) =>
  response(200, {
    name: candidate.package,
    version: candidate.version,
    dist: { integrity: "sha512-" + digest(bytes, "sha512", "base64") },
  });
function npmIdentity(t, configured = true) {
  const values = {
    ACTIONS_ID_TOKEN_REQUEST_URL: configured ? "test" : undefined,
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: configured ? "test" : undefined,
    NODE_AUTH_TOKEN: undefined,
    NPM_TOKEN: undefined,
  };
  for (const [key, value] of Object.entries(values)) {
    const saved = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
    t.after(() => {
      if (saved === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved;
      }
    });
  }
}
test("registry absence differs from lookup failures and conflicts", async (t) => {
  const { candidate, bytes } = candidateFixture(t);
  assert.equal(
    await registryState(candidate, bytes, async () => response(404)),
    "absent"
  );
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(() =>
      registryState(candidate, bytes, async () => response(status))
    );
  }
  await assert.rejects(() =>
    registryState(candidate, bytes, async () => response(200, {}))
  );
  assert.equal(
    await registryState(candidate, bytes, async () =>
      matching(candidate, bytes)
    ),
    "matching"
  );
});
test("lost upload response reconciles exact registry payload; same version never overwritten", async (t) => {
  const { candidate, dir, bytes } = candidateFixture(t);
  let calls = 0,
    uploads = 0;
  const saved = [
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL,
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
  ];
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL = "test";
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = "test";
  t.after(() => {
    for (const [key, value] of [
      ["ACTIONS_ID_TOKEN_REQUEST_URL", saved[0]],
      ["ACTIONS_ID_TOKEN_REQUEST_TOKEN", saved[1]],
    ]) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
  const request = async () =>
    ++calls === 1 ? response(404) : matching(candidate, bytes);
  assert.match(
    await publish(candidate, dir, request, async () => {
      uploads++;
      throw Error("lost response");
    }),
    /verified/
  );
  assert.equal(uploads, 1);
  await publish(
    candidate,
    dir,
    async () => matching(candidate, bytes),
    async () => {
      throw Error("must not upload");
    }
  );
});
test("npm waits for exact registry integrity after one upload, including a lost upload response", async (t) => {
  npmIdentity(t);
  for (const lostResponse of [false, true]) {
    await t.test(
      lostResponse ? "lost response" : "successful upload",
      async (t) => {
        const { candidate, dir, bytes } = candidateFixture(t);
        let lookups = 0;
        let uploads = 0;
        let elapsed = 0;
        assert.equal(
          await publishNpm(
            candidate,
            dir,
            async () =>
              ++lookups < 3 ? response(404) : matching(candidate, bytes),
            async () => {
              uploads++;
              if (lostResponse) {
                throw Error("lost upload response");
              }
            },
            async () => {},
            {
              now: () => elapsed,
              sleep: async (ms) => {
                elapsed += ms;
              },
            }
          ),
          "published; integrity verified"
        );
        assert.equal(uploads, 1);
        assert.equal(lookups, 3);
        assert(elapsed > 0 && elapsed <= 300000);
      }
    );
  }
});
test("npm confirmation stops at five minutes including request time and preserves upload diagnostics", async (t) => {
  npmIdentity(t);
  for (const lostResponse of [false, true]) {
    await t.test(
      lostResponse ? "lost response" : "successful upload",
      async (t) => {
        const { candidate, dir } = candidateFixture(t);
        const uploadFailure = Error(
          "lost upload response; sanitized diagnostics"
        );
        let uploads = 0;
        let elapsed = 0;
        let requestTimeout;
        t.mock.method(AbortSignal, "timeout", (ms) => {
          requestTimeout = ms;
          return new AbortController().signal;
        });
        await assert.rejects(
          () =>
            publishNpm(
              candidate,
              dir,
              async () => {
                if (uploads) {
                  assert(
                    elapsed < 300000,
                    "lookup started after confirmation deadline"
                  );
                  assert(
                    requestTimeout > 0 &&
                      requestTimeout <= Math.min(30000, 300000 - elapsed)
                  );
                  elapsed += 10000;
                }
                return response(404);
              },
              async () => {
                uploads++;
                if (lostResponse) {
                  throw uploadFailure;
                }
              },
              async () => {},
              {
                now: () => elapsed,
                sleep: async (ms) => {
                  elapsed += ms;
                },
              }
            ),
          (error) =>
            lostResponse
              ? error === uploadFailure
              : /absent after five minutes/.test(error.message)
        );
        assert.equal(uploads, 1);
        assert.equal(elapsed, 300000);
        assert(
          requestTimeout < 30000,
          "last lookup must use the remaining budget"
        );
      }
    );
  }
});
test("npm confirmation fails immediately on conflicts, HTTP errors and network failures", async (t) => {
  npmIdentity(t);
  for (const [name, terminal, expected] of [
    [
      "conflicting integrity",
      () => response(200, {}),
      /conflicting or unverifiable integrity/,
    ],
    ...[401, 403, 429, 500].map((status) => [
      `HTTP ${status}`,
      () => response(status),
      new RegExp(`HTTP ${status}`),
    ]),
    [
      "network failure",
      () => {
        throw Error("network failed");
      },
      /network failed/,
    ],
  ]) {
    await t.test(name, async (t) => {
      const { candidate, dir } = candidateFixture(t);
      let lookups = 0;
      let uploads = 0;
      let sleeps = 0;
      await assert.rejects(
        () =>
          publishNpm(
            candidate,
            dir,
            async () => (++lookups <= 2 ? response(404) : terminal()),
            async () => {
              uploads++;
            },
            async () => {},
            {
              now: () => 0,
              sleep: async () => {
                sleeps++;
              },
            }
          ),
        expected
      );
      assert.equal(uploads, 1);
      assert.equal(lookups, 3);
      assert.equal(sleeps, 1, "only the preceding 404 should be retried");
    });
  }
});
test("matching npm versions return without credentials, upload or confirmation waits", async (t) => {
  npmIdentity(t, false);
  const { candidate, dir, bytes } = candidateFixture(t);
  let policyChecks = 0;
  assert.equal(
    await publishNpm(
      candidate,
      dir,
      async () => matching(candidate, bytes),
      async () => assert.fail("existing version must not be uploaded"),
      async () => {
        policyChecks++;
      },
      {
        now: () => assert.fail("existing match must not enter confirmation"),
        sleep: async () => assert.fail("existing match must not wait"),
      }
    ),
    "already published; integrity matches"
  );
  assert.equal(policyChecks, 1);
});
test("missing trust fails before upload; expired artifacts must be rebuilt and verified", async (t) => {
  const { candidate, dir, identity } = candidateFixture(t);
  const old = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  try {
    await assert.rejects(
      () =>
        publish(
          candidate,
          dir,
          async () => response(404),
          async () => assert.fail("upload before trust")
        ),
      /OIDC/
    );
  } finally {
    if (old !== undefined) {
      process.env.ACTIONS_ID_TOKEN_REQUEST_URL = old;
    }
  }
  fs.unlinkSync(path.join(dir, candidate.artifact));
  assert.throws(() => checkCandidate(candidate, identity, dir, inventory));
});

test("recovery cannot publish below an acknowledged breaking public API version", () => {
  const majorClient = {
    ...client,
    baseline: { minimumAutomatedVersion: "2.0.0" },
  };
  assert.throws(
    () => parseTag(majorClient, "client-js-v1.0.4"),
    /compatibility floor/
  );
  assert.equal(parseTag(majorClient, "client-js-v2.0.0"), "2.0.0");
});

function policyRequest(state, { fail = false, head = policySha } = {}) {
  const observed = [];
  const request = async (route) => {
    observed.push(route);
    if (fail) {
      throw Error("current policy unavailable");
    }
    if (route.endsWith("/git/ref/heads/main")) {
      return { object: { type: "commit", sha: head } };
    }
    const contents = {
      ".github/sdk-release-inventory.json": state.inventory,
      "release-please-config.json": state.config,
      ".release-please-manifest.json": state.manifest,
    };
    const file = Object.keys(contents).find((name) =>
      route.endsWith("/contents/" + name + "?ref=" + head)
    );
    if (!file) {
      throw Error("Unpinned policy read: " + route);
    }
    return {
      encoding: "base64",
      content: Buffer.from(JSON.stringify(contents[file])).toString("base64"),
    };
  };
  return { request, observed };
}
test("current policy is fetched at one immutable main SHA and fails closed", async () => {
  const { request, observed } = policyRequest(policy);
  const current = await currentPolicy(inventory.repository, request, "true");
  assert.equal(current.policyRevision, policySha);
  assert.equal(observed.length, 4);
  assert(
    observed.slice(1).every((route) => route.endsWith("?ref=" + policySha))
  );
  await assert.rejects(
    () =>
      currentPolicy(
        inventory.repository,
        policyRequest(policy, { fail: true }).request,
        "true"
      ),
    /unavailable/
  );
  await assert.rejects(
    () =>
      currentPolicy(
        inventory.repository,
        policyRequest(policy, { head: "main" }).request,
        "true"
      ),
    /resolve current main/
  );
  await assert.rejects(
    () =>
      currentPolicy(
        inventory.repository,
        async () => assert.fail("read after stop"),
        "false"
      ),
    /SDK_RELEASES_ENABLED/
  );
});
test("current publisher and global stops override historical enabled release policy", () => {
  const historicalEnabled = structuredClone(policy);
  assert.equal(
    authorizePolicy(historicalEnabled, "js", "2.0.0", "true").id,
    "js"
  );
  const disabledNow = structuredClone(policy);
  disabledNow.inventory.clients.find(
    (c) => c.id === "js"
  ).publish.enabled = false;
  assert.throws(
    () => authorizePolicy(disabledNow, "js", "2.0.0", "true"),
    /enabled for publishing/
  );
  disabledNow.inventory.automation.enabled = false;
  assert.throws(() => authorizePolicy(disabledNow, "rust", "2.0.0", "true"));
  assert.throws(
    () => authorizePolicy(historicalEnabled, "js", "2.0.0", "false"),
    /SDK_RELEASES_ENABLED/
  );
});
test("generation-only policy cannot select, recover, or authorize a registry upload", async (t) => {
  const generationOnly = policyFixture();
  for (const sdk of generationOnly.inventory.clients) {
    sdk.publish.enabled = false;
    sdk.publish.trustVerified = false;
    sdk.publish.preflightVerified = false;
    if (sdk.baseline) {
      sdk.baseline.ownershipVerified = false;
    }
  }
  assert.equal(
    validateConfig({ ...generationOnly, requireReady: true }).ready,
    true
  );
  const approved = [
    { sdk: "js", tag, revision: sha },
    { sdk: "rust", tag: "client-rust-v2.0.0", revision: sha },
  ];
  assert.deepEqual(selectCandidates(generationOnly.inventory, approved), []);
  for (const candidate of approved) {
    assert.throws(
      () =>
        selectCandidates(
          generationOnly.inventory,
          [],
          candidate.sdk,
          candidate.tag
        ),
      /enabled for publishing/
    );
    assert.throws(
      () => authorizePolicy(generationOnly, candidate.sdk, "2.0.0", "true"),
      /enabled for publishing/
    );
  }
  const { candidate, dir } = candidateFixture(t);
  await assert.rejects(
    () =>
      publishNpm(
        candidate,
        dir,
        async () => assert.fail("generation-only policy contacted npm"),
        async () => assert.fail("generation-only policy uploaded a package"),
        async (sdk, version) =>
          authorizePolicy(generationOnly, sdk, version, "true")
      ),
    /enabled for publishing/
  );
});
test("recovery and automatic selection reject an older major under the current reviewed policy", async () => {
  const next = structuredClone(policy);
  next.inventory.versionPolicy.major = 3;
  for (const component of [
    ...next.inventory.clients,
    ...next.inventory.internalComponents,
  ].filter((c) => c.release.managed)) {
    component.release.managementSeed = "2.0.0";
    component.release.firstReleaseTarget = "3.0.0";
    next.manifest[component.directory] = "3.0.0";
  }
  assert.throws(
    () => authorizePolicy(next, "js", "2.0.0", "true"),
    /configured major 3/
  );
  assert.throws(
    () => selectCandidates(next.inventory, [], "js", tag),
    /configured major 3/
  );
  assert.throws(
    () =>
      selectCandidates(next.inventory, [
        { sdk: "rust", tag: "client-rust-v2.9.0", revision: sha },
      ]),
    /configured major 3/
  );
  assert.equal(authorizePolicy(next, "rust", "3.2.1", "true").id, "rust");
});
test("publication-disabled automatic releases are skipped and enablement never scans historical backlog", () => {
  const disabled = structuredClone(inventory);
  disabled.clients.find((c) => c.id === "js").publish.enabled = false;
  assert.deepEqual(
    selectCandidates(disabled, [{ sdk: "js", tag, revision: sha }]),
    []
  );
  assert.throws(
    () => selectCandidates(disabled, [], "js", tag),
    /enabled for publishing/
  );
  assert.deepEqual(selectCandidates(inventory, []), []);
});
test("stopping or de-managing JS preserves an independently approved Rust candidate", () => {
  const rust = { sdk: "rust", tag: "client-rust-v2.0.0", revision: sha };
  const emitted = [{ sdk: "js", tag, revision: sha }, rust];
  for (const managed of [true, false]) {
    const stopped = structuredClone(inventory);
    const js = stopped.clients.find((client) => client.id === "js");
    js.publish.enabled = false;
    js.release.managed = managed;
    stopped.internalComponents[0].release.managed = managed;
    assert.deepEqual(selectCandidates(stopped, emitted), [rust]);
    assert.throws(
      () => selectCandidates(stopped, [], "js", tag),
      /not managed|enabled for publishing/
    );
    for (const sdk of ["types", "python", "unknown"]) {
      assert.throws(
        () => selectCandidates(stopped, [rust, { sdk, tag, revision: sha }]),
        /no implemented publishing route/
      );
    }
  }
});
test("preflight evidence cannot supply approved candidate bytes or a different source revision", (t) => {
  const { candidate, identity, dir } = candidateFixture(t);
  assert.throws(
    () =>
      checkCandidate(
        { ...candidate, kind: "sdk-preflight" },
        identity,
        dir,
        inventory
      ),
    /approved release source/
  );
  assert.throws(
    () =>
      checkCandidate(
        { ...candidate, sourceRevision: "c".repeat(40) },
        identity,
        dir,
        inventory
      ),
    /approved release source/
  );
  // A newer main decision may authorize the same approved bytes; it does not
  // alter the candidate's recorded package verification/source identity.
  checkCandidate(
    candidate,
    { ...identity, policyRevision: "c".repeat(40) },
    dir,
    inventory
  );
});
test("npm rechecks current policy after packaging and before OIDC upload", async (t) => {
  const { candidate, dir } = candidateFixture(t);
  let checks = 0,
    uploads = 0;
  const saved = [
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL,
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
  ];
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL = "test";
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = "test";
  t.after(() => {
    for (const [index, key] of [
      "ACTIONS_ID_TOKEN_REQUEST_URL",
      "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
    ].entries()) {
      if (saved[index] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[index];
      }
    }
  });
  await assert.rejects(
    () =>
      publishNpm(
        candidate,
        dir,
        async () => response(404),
        async () => uploads++,
        async () => {
          if (++checks === 2) {
            throw Error("publisher disabled after packaging");
          }
        }
      ),
    /disabled after packaging/
  );
  assert.equal(checks, 2);
  assert.equal(uploads, 0);
});

test("candidate creation requires complete fresh shared package evidence and binds all receipt bytes", (t) => {
  const { dir, identity, candidate } = candidateFixture(t);
  assert.throws(() => verifiedPackageFiles(identity, dir), /ENOENT/);
  const receipt = {
    schemaVersion: 1,
    kind: "sdk-package-verification",
    sdk: "js",
    package: identity.package,
    version: identity.version,
    revision: sha,
    artifact: candidate.artifact,
    files: candidate.files,
    toolchains: {
      node: "v24.16.0",
      npm: require("./preflight.cjs").NPM_VERSION,
      python: "Python 3.13",
      pnpm: "10.24.0",
    },
    verification: { package: true, consumer: true, native: true },
  };
  const writeReceipt = (value) =>
    fs.writeFileSync(
      path.join(dir, "verification.json"),
      JSON.stringify(value)
    );
  writeReceipt(receipt);
  assert.deepEqual(verifiedPackageFiles(identity, dir).files, [
    "verification.json",
    "client.tgz",
  ]);
  for (const update of [
    { revision: "c".repeat(40) },
    { version: "2.0.1" },
    { verification: { package: true, consumer: true } },
    { kind: "sdk-preflight" },
  ]) {
    writeReceipt({ ...receipt, ...update });
    assert.throws(() => verifiedPackageFiles(identity, dir));
  }
  writeReceipt(receipt);
  fs.writeFileSync(path.join(dir, "client.tgz"), "different package");
  assert.throws(() => verifiedPackageFiles(identity, dir), /digest mismatch/);
});

test("accepted management cannot authorize publication while the global inventory stop remains set", async (t) => {
  const stopped = policyFixture();
  stopped.inventory.automation.enabled = false;
  stopped.inventory.automation.reason =
    "Reviewed adoption remains globally stopped";
  assert.equal(validateConfig(stopped).ready, false);
  const { candidate, dir } = candidateFixture(t);
  await assert.rejects(
    () =>
      publishNpm(
        candidate,
        dir,
        async () => assert.fail("stopped adoption contacted npm"),
        async () => assert.fail("stopped adoption uploaded a package"),
        async (sdk, version) => authorizePolicy(stopped, sdk, version, "true")
      ),
    /Reviewed adoption remains globally stopped/
  );
});
