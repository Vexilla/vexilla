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
const { digest, checkCandidate } = require("./candidate.cjs");
const { registryState, publish } = require("./publish-npm.cjs");
const sha = "a".repeat(40);
const client = {
  id: "js",
  enabled: true,
  component: "client-js",
  directory: "clients/js",
  publish: { package: "@vexilla/client" },
};
const inventory = {
  repository: "Vexilla/vexilla",
  clients: [client, { id: "python", enabled: false }],
};
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
const approved = (p = pr, r = release, s = sha) =>
  validateApproval(client, tag, s, r, p, files, "write", "release[bot]");
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
    "release[bot]"
  );
  assert.equal(identity.revision, sha);
  assert(
    routes
      .filter((r) => r.includes("/contents/"))
      .every((r) => r.endsWith("?ref=" + sha))
  );
  await assert.rejects(() =>
    verifyRelease(inventory, "js", tag, "b".repeat(40), request, "release[bot]")
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
