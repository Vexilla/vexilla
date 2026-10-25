"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { GitHub, Manifest, setLogger } = require("release-please");
const { Octokit } = require("@octokit/rest");
const { FileNotFoundError } = require("release-please/build/src/errors");
const { readReleaseState, ROOT } = require("./check-release-config.cjs");
const { orchestrate, assertReleaseCandidates } = require("./orchestrate.cjs");
const {
  releaseSnapshot,
  SupersededSnapshot,
} = require("./release-snapshot.cjs");

const quiet = Object.fromEntries(
  ["info", "warn", "error", "debug", "trace"].map((key) => [key, () => {}])
);
setLogger(quiet);
const baseline = "b".repeat(40);
const revision = "a".repeat(40);
const later = "c".repeat(40);

// Only the GitHub transport and repository file store are fake. The published
// Manifest, PR parsers, GitHub iterators/updaters and code-suggester execute.
async function repository(sdk = "js") {
  const state = readReleaseState();
  const components = [
    ...state.inventory.clients.filter((c) => c.enabled),
    ...state.inventory.internalComponents,
  ];
  state.manifest = Object.fromEntries(
    components.map((c) => [c.directory, "2.0.0"])
  );
  state.config["bootstrap-sha"] = baseline;
  state.inventory.automation = { enabled: true, historyBoundary: baseline };
  for (const c of state.inventory.clients.filter((c) => c.enabled)) {
    Object.assign(c.baseline, {
      verified: true,
      ownershipVerified: true,
      publicTypeCompatibilityReviewed: true,
      licenseConfirmed: true,
      sourceRevision: baseline,
      registryVersion: "2.0.0",
      manifestVersion: "2.0.0",
    });
  }
  const dir = components.find((c) => c.id === sdk).directory;
  const source = `${dir}/${
    sdk === "js" ? "package.json" : sdk === "rust" ? "Cargo.toml" : "mix.exs"
  }`;
  const r = {
    state,
    head: revision,
    reads: [],
    writes: [],
    open: [],
    merged: [],
    trees: [],
  };
  r.changedFiles = [source];
  r.published = components.map((c) => ({
    name: c.component,
    tag: { name: `${c.component}-v2.0.0` },
    tagCommit: { oid: baseline },
    url: "https://example.invalid/release",
    description: "",
    isDraft: false,
  }));
  const restPR = (pr) => ({
    ...pr,
    base: { ref: "main" },
    head: { ref: pr.branch, label: `Vexilla:${pr.branch}` },
    labels: (pr.labels || []).map((name) => ({ name })),
  });
  const graphPR = (pr) => ({
    number: pr.number,
    title: pr.title,
    body: pr.body,
    baseRefName: "main",
    headRefName: pr.branch,
    labels: { nodes: (pr.labels || []).map((name) => ({ name })) },
    mergeCommit: pr.sha ? { oid: pr.sha } : null,
    files: { nodes: [], pageInfo: { hasNextPage: false } },
  });
  const commits = () => [
    ...(r.head === later
      ? [
          {
            sha: later,
            message: "feat(js)!: later change",
            files: ["clients/js/package.json"],
          },
        ]
      : []),
    {
      sha: revision,
      message: `fix(${sdk}): repair SDK`,
      files: r.changedFiles,
    },
    { sha: baseline, message: "chore: baseline", files: [] },
  ];
  const write = (method, args) => r.writes.push({ method, ...args });
  const octokit = {
    paginate: {
      async *iterator(route, args) {
        assert.equal(route, "GET /repos/{owner}/{repo}/pulls");
        yield {
          data: (args.state === "open" ? r.open : r.merged).map((pr) => ({
            ...restPR(pr),
            merge_commit_sha: pr.sha,
            merged_at: pr.sha ? "2026-10-24T00:00:00Z" : null,
          })),
        };
      },
    },
    repos: {
      async getBranch(args) {
        const sha = r.head;
        r.parentReads = (r.parentReads || 0) + 1;
        r.beforeParent?.();
        return { data: { commit: { sha }, name: args.branch } };
      },
      async createRelease(args) {
        write("createRelease", args);
        r.published.unshift({
          name: args.name,
          tag: { name: args.tag_name },
          tagCommit: { oid: args.target_commitish },
          url: "https://example.invalid/release",
          description: args.body,
          isDraft: args.draft,
        });
        return {
          data: {
            ...args,
            id: 10,
            html_url: "https://example.invalid/release",
          },
        };
      },
    },
    git: {
      async getRef() {
        if (r.open.length) {
          return { data: { ref: "existing-release-branch" } };
        }
        throw Object.assign(Error("missing branch"), { status: 404 });
      },
      async createRef(args) {
        write("createRef", args);
        return { data: { url: "https://example.invalid/ref" } };
      },
      async getCommit(args) {
        return { data: { tree: { sha: args.commit_sha } } };
      },
      async createTree(args) {
        write("createTree", args);
        r.trees.push(args);
        return { data: { sha: "d".repeat(40) } };
      },
      async createCommit(args) {
        write("createCommit", args);
        return {
          data: { sha: "e".repeat(40), url: "https://example.invalid/commit" },
        };
      },
      async updateRef(args) {
        write("updateRef", args);
        return { data: {} };
      },
    },
    pulls: {
      async list() {
        return { data: r.open.map(restPR) };
      },
      async create(args) {
        write("createPR", args);
        const pr = {
          ...args,
          branch: args.head.split(":")[1],
          number: 42,
          labels: [],
        };
        r.open.push(pr);
        return { data: { ...restPR(pr), url: "https://example.invalid/pr" } };
      },
      async get(args) {
        return {
          data: restPR(r.open.find((p) => p.number === args.pull_number)),
        };
      },
      async update(args) {
        write("updatePR", args);
        const pr = r.open.find((p) => p.number === args.pull_number);
        Object.assign(pr, args);
        return { data: restPR(pr) };
      },
    },
    issues: {
      async addLabels(args) {
        [...r.open, ...r.merged]
          .find((p) => p.number === args.issue_number)
          .labels.push(...args.labels);
        return { data: [] };
      },
      async removeLabel(args) {
        const pr = [...r.open, ...r.merged].find(
          (p) => p.number === args.issue_number
        );
        pr.labels = pr.labels.filter((label) => label !== args.name);
        return { data: [] };
      },
      async createComment() {
        return { data: {} };
      },
    },
  };
  const graphql = async ({ query, states }) => {
    if (query.includes("query pullRequestsSince")) {
      return {
        repository: {
          ref: {
            target: {
              history: {
                nodes: commits().map((c) => ({
                  ...c,
                  associatedPullRequests: {
                    nodes: [
                      {
                        ...graphPR({
                          number: 1,
                          title: c.message,
                          body: "",
                          labels: [],
                          sha: c.sha,
                          branch: "feature",
                        }),
                        files: {
                          nodes: c.files.map((p) => ({ path: p })),
                          pageInfo: { hasNextPage: false },
                        },
                      },
                    ],
                  },
                })),
                pageInfo: { hasNextPage: false },
              },
            },
          },
        },
      };
    }
    if (query.includes("query mergedPullRequests")) {
      return {
        repository: {
          pullRequests: {
            nodes: (states === "MERGED"
              ? r.merged
              : states === "OPEN"
              ? r.open
              : []
            ).map(graphPR),
            pageInfo: { hasNextPage: false },
          },
        },
      };
    }
    if (query.includes("query releases")) {
      return {
        repository: {
          releases: { nodes: r.published, pageInfo: { hasNextPage: false } },
        },
      };
    }
    throw Error("Unexpected GraphQL query: " + query);
  };
  r.github = await GitHub.create({
    owner: "Vexilla",
    repo: "vexilla",
    defaultBranch: "main",
    logger: quiet,
    octokitAPIs: {
      octokit,
      graphql,
      request: () => {
        throw Error("Unexpected HTTP request");
      },
    },
  });
  r.github.getFileContentsOnBranch = async (name, ref) => {
    r.reads.push({ name, ref });
    let text;
    if (name === "release-please-config.json") {
      text = JSON.stringify(state.config);
    } else if (name === ".release-please-manifest.json") {
      text = JSON.stringify(state.manifest);
    } else {
      try {
        text = fs.readFileSync(path.join(ROOT, name), "utf8");
      } catch {
        throw new FileNotFoundError(name);
      }
      if (name.endsWith("package.json")) {
        const value = JSON.parse(text);
        value.version = state.manifest[path.dirname(name)];
        if (name === "clients/js/package.json") {
          value.description =
            ref === later || (ref === "main" && r.head === later)
              ? "new description"
              : "old description";
        }
        text = JSON.stringify(value, null, 2) + "\n";
      } else if (name.endsWith("mix.exs")) {
        text = text.replace(
          /version: "[^"]+"/,
          `version: "${state.manifest[path.dirname(name)]}"`
        );
      } else if (name.endsWith("Cargo.toml")) {
        text = text.replace(
          /version = "[^"]+"/,
          `version = "${state.manifest[path.dirname(name)]}"`
        );
      }
    }
    r.afterRead?.(name, ref);
    return {
      content: Buffer.from(text).toString("base64"),
      parsedContent: text,
      sha: ref,
    };
  };
  return r;
}

function setEvent(t) {
  const previous = process.env.GITHUB_SHA;
  process.env.GITHUB_SHA = revision;
  t.after(() => {
    if (previous === undefined) {
      delete process.env.GITHUB_SHA;
    } else {
      process.env.GITHUB_SHA = previous;
    }
  });
}

test("snapshot client scopes the actual Octokit endpoint proxy without changing the original", async () => {
  let head = revision;
  const api = new Octokit({
    request: {
      fetch: async () =>
        new Response(JSON.stringify({ commit: { sha: head } }), {
          headers: { "content-type": "application/json" },
        }),
    },
  });
  const original = api.repos.getBranch;
  const scm = releaseSnapshot(
    { getGitHubApi: () => ({ octokitAPIs: { octokit: api } }) },
    revision
  );
  assert.equal(api.repos.getBranch, original);
  const options = { owner: "Vexilla", repo: "vexilla", branch: "main" };
  assert.equal(
    (await scm.octokit.repos.getBranch(options)).data.commit.sha,
    revision
  );
  head = later;
  await assert.rejects(
    scm.octokit.repos.getBranch(options),
    (error) => error instanceof SupersededSnapshot && error.bail === true
  );
  assert.equal((await api.repos.getBranch(options)).data.commit.sha, later);
});

for (const sdk of ["js", "rust", "elixir"]) {
  test(`${sdk} generated PR roundtrips through real API PR shape into approved releases`, async () => {
    const r = await repository(sdk);
    const manifest = await Manifest.fromManifest(r.github, "main");
    await manifest.createPullRequests();
    assert.equal(r.open.length, 1);
    r.merged = r.open.map((pr) => ({ ...pr, sha: revision }));
    r.open = [];
    const approved = await Manifest.fromManifest(r.github, "main");
    const releases = await approved.buildReleases();
    const expected =
      sdk === "js" ? ["clients/js", "packages/types"] : [`clients/${sdk}`];
    assert.deepEqual(releases.map((c) => c.path).sort(), expected.sort());
    for (const c of releases) {
      assert.equal(c.pullRequest.sha, revision);
      assert.equal(c.pullRequest.mergeCommitOid, undefined);
      r.state.manifest[c.path] = "2.0.1";
    }
    assert.doesNotThrow(() =>
      assertReleaseCandidates(releases, r.state.inventory, r.state.manifest)
    );
  });
}

test("stale event defers PR changes without reverting live main files", async (t) => {
  setEvent(t);
  const r = await repository();
  r.head = later;
  const candidates = await orchestrate({
    github: r.github,
    state: r.state,
    Manifest,
  });
  assert.deepEqual(candidates, []);
  assert.deepEqual(r.writes, []);
  assert.equal(r.parentReads, 1, "a superseded snapshot must not be retried");
});

test("main advancing during file updates defers PR changes before any write", async (t) => {
  setEvent(t);
  const r = await repository();
  r.afterRead = (name) => {
    if (name === "clients/js/package.json") {
      r.head = later;
    }
  };
  assert.deepEqual(
    await orchestrate({ github: r.github, state: r.state, Manifest }),
    []
  );
  assert.deepEqual(r.writes, []);
});

test("advancement after parent selection retains the immutable read snapshot as tree and parent", async (t) => {
  setEvent(t);
  const r = await repository();
  r.beforeParent = () => {
    r.head = later;
  };
  await orchestrate({ github: r.github, state: r.state, Manifest });
  assert.equal(r.head, later);
  const commit = r.writes.find((w) => w.method === "createCommit");
  assert.deepEqual(commit.parents, [revision]);
  assert.equal(r.trees[0].base_tree, revision);
  assert.equal(r.writes.find((w) => w.method === "createPR").base, "main");
  assert(
    r.reads
      .filter((r) => r.name === "clients/js/package.json")
      .every((r) => r.ref === revision)
  );
});

for (const superseded of [false, true]) {
  test(`existing PR update ${
    superseded ? "defers on advancement" : "uses the snapshot parent"
  }`, async (t) => {
    setEvent(t);
    const r = await repository();
    const manifest = await Manifest.fromManifest(r.github, "main");
    await manifest.createPullRequests();
    r.writes.length = 0;
    r.trees.length = 0;
    if (superseded) {
      r.afterRead = (name) => {
        if (name === "clients/js/package.json") {
          r.head = later;
        }
      };
    }
    await orchestrate({ github: r.github, state: r.state, Manifest });
    if (superseded) {
      assert.deepEqual(r.writes, []);
    } else {
      assert(r.writes.some((w) => w.method === "updatePR"));
      assert(!r.writes.some((w) => w.method === "createRef"));
      assert.deepEqual(
        r.writes.find((w) => w.method === "createCommit").parents,
        [revision]
      );
      assert.equal(r.trees[0].base_tree, revision);
    }
  });
}

test("already created native publication candidates survive superseded PR maintenance", async (t) => {
  setEvent(t);
  const r = await repository("rust");
  const manifest = await Manifest.fromManifest(r.github, "main");
  await manifest.createPullRequests();
  r.merged = r.open.map((pr) => ({ ...pr, sha: revision }));
  r.open = [];
  r.state.manifest["clients/rust"] = "2.0.1";
  r.changedFiles.push("clients/js/package.json");
  r.writes.length = 0;
  r.afterRead = (name) => {
    if (name === "clients/js/package.json") {
      r.head = later;
    }
  };
  const candidates = await orchestrate({
    github: r.github,
    state: r.state,
    Manifest,
  });
  assert.deepEqual(candidates, [
    { sdk: "rust", tag: "client-rust-v2.0.1", revision },
  ]);
  assert.deepEqual(
    r.writes.map((w) => w.method),
    ["createRelease"]
  );
});

test("unrelated repository errors still fail PR maintenance", async (t) => {
  setEvent(t);
  const r = await repository();
  r.afterRead = () => {
    throw Error("repository unavailable");
  };
  await assert.rejects(
    orchestrate({ github: r.github, state: r.state, Manifest }),
    /repository unavailable/
  );
  assert.deepEqual(r.writes, []);
});
