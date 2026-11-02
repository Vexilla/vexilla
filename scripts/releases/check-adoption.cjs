#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { Manifest, VERSION, setLogger } = require("release-please");
const { ROOT, SHA, validateConfig } = require("./check-release-config.cjs");
const { managedComponents } = require("./release-policy.cjs");
const { applyReleaseInputs } = require("./release-inputs.cjs");
const { assertStablePullRequests } = require("./orchestrate.cjs");

const acceptedBoundary = "8b4d80c05abec38d953f38b6bf59ff96462939fa";
const acceptedSource = "9bd974df2efe1693b142fed184c42785565119d7";

// Portable observations of the actual accepted history, captured read-only from
// git. CI's shallow checkout need not contain these original commit objects.
const observedHistory = [
  {
    sha: "9bd974df2efe1693b142fed184c42785565119d7",
    message: "ci: coordinate SDK major releases and add publishing preflight",
    files: [
      ".github/actions/sdk-verify/action.yml",
      ".github/sdk-release-inventory.json",
      ".github/workflows/sdk-preflight.yml",
      ".github/workflows/sdk-publish.yml",
      ".github/workflows/sdk-release.yml",
      "clients/elixir/ADOPTION.md",
      "clients/js/ADOPTION.md",
      "clients/js/scripts/check-package.cjs",
      "clients/js/test/package-consumer/README.md",
      "clients/rust/ADOPTION.md",
      "docs/sdk-native-packaging.md",
      "docs/sdk-release-adoption.md",
      "docs/sdk-release-baselines.md",
      "docs/sdk-releases.md",
      "packages/types/package.json",
      "release-please-config.json",
      "scripts/releases/candidate.cjs",
      "scripts/releases/check-release-config.cjs",
      "scripts/releases/current-policy.cjs",
      "scripts/releases/orchestrate.cjs",
      "scripts/releases/orchestration.test.cjs",
      "scripts/releases/package-native.py",
      "scripts/releases/pr-title.cjs",
      "scripts/releases/preflight-npm-policy.cjs",
      "scripts/releases/preflight.cjs",
      "scripts/releases/preflight.test.cjs",
      "scripts/releases/publication.test.cjs",
      "scripts/releases/publish-native.cjs",
      "scripts/releases/publish-native.test.cjs",
      "scripts/releases/publish-npm.cjs",
      "scripts/releases/release-config.test.cjs",
      "scripts/releases/release-identity.cjs",
      "scripts/releases/release-inputs.cjs",
      "scripts/releases/release-policy.cjs",
      "scripts/releases/report-outcomes.cjs",
      "scripts/releases/select-candidates.cjs",
      "scripts/releases/workflow-policy.test.cjs",
    ],
  },
  {
    sha: "3994eb1d22fcf55e40c8787fb0ee6602dfd4b7da",
    message: "docs: update JS and Rust markdown files for latest API (#69)",
    files: [
      "clients/js/README.md",
      "clients/js/README.toml",
      "clients/rust/README.md",
      "clients/rust/README.toml",
    ],
  },
];

// This is a reviewed generation input fixture, not a claim that this commit or
// its resulting release exists. The CLI below reads the real committed input.
const preparedInput = {
  sha: "0".repeat(39) + "1",
  message:
    "feat(sdk)!: adopt the shared major-2 SDK contract\n\nBREAKING CHANGE: adopt the reviewed JS type migration and accumulated native SDK changes on the common major-2 release line.",
  files: [
    "clients/js/ADOPTION.md",
    "clients/rust/ADOPTION.md",
    "clients/elixir/ADOPTION.md",
  ],
};

async function buildAdoptionPullRequests({
  state,
  commits,
  revision = acceptedSource,
  readFile = (name) => fs.readFileSync(path.join(ROOT, name), "utf8"),
}) {
  assert.equal(VERSION, "17.11.2");
  validateConfig(state);
  const boundary = state.inventory.automation.historyBoundary;
  assert(
    SHA.test(boundary || ""),
    "Accepted immutable adoption boundary is required"
  );
  assert(SHA.test(revision || ""), "Immutable adoption revision is required");
  const scm = {
    repository: { owner: "Vexilla", repo: "vexilla", defaultBranch: "main" },
    async getFileJson(name) {
      if (name === "release-please-config.json") {
        return structuredClone(state.config);
      }
      if (name === ".release-please-manifest.json") {
        return structuredClone(state.manifest);
      }
      throw Error(`Unexpected adoption JSON read: ${name}`);
    },
    async getFileContentsOnBranch(name) {
      const parsedContent = readFile(name);
      return {
        parsedContent,
        content: Buffer.from(parsedContent).toString("base64"),
        sha: revision,
      };
    },
    async *releaseIterator() {},
    async *tagIterator() {},
    async *mergeCommitIterator() {
      yield* commits;
      yield {
        sha: boundary,
        message: "chore: accepted shared boundary",
        files: [],
      };
    },
    async *pullRequestIterator() {},
    // No GitHub or registry mutation methods are supplied. Building proposals
    // cannot create a remote PR, tag, GitHub Release, or registry publication.
  };
  const manifest = await Manifest.fromManifest(
    applyReleaseInputs(scm, state.inventory),
    "main"
  );
  return manifest.buildPullRequests();
}

function verifyFirstAdoption(pullRequests, state) {
  assertStablePullRequests(pullRequests, state);
  const versions = Object.fromEntries(
    pullRequests.flatMap((pr) =>
      pr.body.releaseData.map((entry) => [
        entry.component,
        entry.version.toString(),
      ])
    )
  );
  const expected = Object.fromEntries(
    managedComponents(state.inventory).map((component) => [
      component.component,
      component.release.firstReleaseTarget,
    ])
  );
  assert(Object.keys(expected).length > 0, "No managed adoption components");
  assert.deepEqual(
    versions,
    expected,
    "Every managed group must propose its exact first target"
  );
  return versions;
}

// Manual, read-only local verification after a real breaking adoption commit.
// It reads configuration, native files and commit history at the same immutable
// revision. Portable fixture tests above do not require a full git clone in CI.
function gitInputs(revision) {
  const git = (args) =>
    execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trimEnd();
  const resolved = revision || git(["rev-parse", "HEAD"]);
  assert(SHA.test(resolved), "Pass a full immutable commit SHA");
  const readFile = (name) => git(["show", `${resolved}:${name}`]);
  const state = {
    inventory: JSON.parse(readFile(".github/sdk-release-inventory.json")),
    config: JSON.parse(readFile("release-please-config.json")),
    manifest: JSON.parse(readFile(".release-please-manifest.json")),
  };
  const boundary = state.inventory.automation.historyBoundary;
  assert(
    SHA.test(boundary || ""),
    "Committed inventory has no accepted boundary"
  );
  execFileSync("git", ["merge-base", "--is-ancestor", boundary, resolved], {
    cwd: ROOT,
  });
  const revisions = git(["rev-list", `${boundary}..${resolved}`])
    .split("\n")
    .filter(Boolean);
  const commits = revisions.map((sha) => ({
    sha,
    message: git(["show", "-s", "--format=%B", sha]),
    files: git(["diff-tree", "--no-commit-id", "--name-only", "-r", sha])
      .split("\n")
      .filter(Boolean),
  }));
  return { state, commits, revision: resolved, readFile };
}

if (require.main === module) {
  setLogger(
    Object.fromEntries(
      ["info", "warn", "error", "debug", "trace"].map((name) => [
        name,
        () => {},
      ])
    )
  );
  (async () => {
    const inputs = gitInputs(process.argv[2]);
    const pullRequests = await buildAdoptionPullRequests(inputs);
    const versions = verifyFirstAdoption(pullRequests, inputs.state);
    console.log(
      JSON.stringify(
        {
          revision: inputs.revision,
          historyBoundary: inputs.state.inventory.automation.historyBoundary,
          versions,
          proposals: pullRequests.map((pr) => ({
            branch: pr.headRefName,
            updates: pr.updates.map((update) => update.path),
          })),
          remoteWrites: false,
        },
        null,
        2
      )
    );
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  acceptedBoundary,
  acceptedSource,
  observedHistory,
  preparedInput,
  buildAdoptionPullRequests,
  verifyFirstAdoption,
  gitInputs,
};
