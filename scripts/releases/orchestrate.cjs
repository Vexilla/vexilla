#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");
const { applyReleaseInputs } = require("./release-inputs.cjs");
const {
  releaseSnapshot,
  SupersededSnapshot,
} = require("./release-snapshot.cjs");
const {
  ROOT,
  STABLE,
  SHA,
  readReleaseState,
  validateConfig,
  compareVersions,
} = require("./check-release-config.cjs");

function assertMinimumVersion(component, version) {
  const minimum = component.baseline?.minimumAutomatedVersion;
  if (minimum) {
    assert(
      compareVersions(version, minimum) >= 0,
      `${component.id} automated release ${version} is below required minimum ${minimum}`
    );
  }
}

function assertStablePullRequests(pullRequests, state) {
  for (const pr of pullRequests) {
    const versions = [
      pr.version,
      ...pr.body.releaseData.map((entry) => entry.version),
    ].filter(Boolean);
    assert(versions.length > 0, "Release PR contains no version");
    for (const version of versions) {
      assert(
        STABLE.test(version.toString()),
        `Unsupported release PR version: ${version}`
      );
    }
    if (state) {
      const components = [
        ...state.inventory.clients.filter((c) => c.enabled),
        ...state.inventory.internalComponents,
      ];
      for (const entry of pr.body.releaseData) {
        const component = components.find(
          (c) => c.component === entry.component
        );
        assert(
          component && entry.version,
          `Release PR has unmanaged component ${entry.component}`
        );
        const version = entry.version.toString();
        assertMinimumVersion(component, version);
        assert(
          compareVersions(version, state.manifest[component.directory]) > 0,
          `${
            component.id
          } proposed version must advance beyond current manifest ${
            state.manifest[component.directory]
          }`
        );
      }
    }
  }
}

function assertReleaseCandidates(releases, inventory, manifestVersions) {
  const components = [
    ...inventory.clients.filter((c) => c.enabled),
    ...inventory.internalComponents,
  ];
  for (const release of releases) {
    const component = components.find((c) => c.directory === release.path);
    assert(
      component,
      `Release for disabled/unmanaged component: ${release.path}`
    );
    const version = release.tag.version.toString();
    assert(STABLE.test(version), `Unsupported release version: ${version}`);
    assertMinimumVersion(component, version);
    if (manifestVersions) {
      assert.equal(
        version,
        manifestVersions[component.directory],
        `Approved ${component.id} tag must match the checked-out release manifest`
      );
    }
    assert.equal(
      release.tag.toString(),
      component.tagTemplate.replace("{version}", version)
    );
    assert(
      SHA.test(release.sha),
      "Release must resolve to an immutable revision"
    );
    assert.equal(release.pullRequest.baseBranchName, "main");
    assert.equal(
      release.pullRequest.sha,
      release.sha,
      "Release revision must be the merged approval PR"
    );
    assert(
      Number.isSafeInteger(release.pullRequest.number) &&
        release.pullRequest.number > 0
    );
    assert(
      !release.prerelease && !release.draft && !release.forceTag,
      "Only approved stable releases without moving tags are supported"
    );
  }
}

function publicationCandidates(releases, inventory) {
  return releases.filter(Boolean).flatMap((release) => {
    const sdk = inventory.clients.find(
      (client) => client.enabled && client.directory === release.path
    );
    if (!sdk) {
      return [];
    }
    assert(STABLE.test(release.version), "Publication version must be stable");
    assertMinimumVersion(sdk, release.version);
    assert.equal(
      release.tagName,
      sdk.tagTemplate.replace("{version}", release.version)
    );
    assert(SHA.test(release.sha));
    return [{ sdk: sdk.id, tag: release.tagName, revision: release.sha }];
  });
}

async function orchestrate({ github, state, Manifest }) {
  validateConfig({ ...state, requireReady: true });
  // Read configuration from the same reviewed checkout as the inventory. Native
  // manifests are read at the workflow revision so a later main push cannot
  // replace the version/package content used by this invocation.
  const scm = applyReleaseInputs(
    releaseSnapshot(github, process.env.GITHUB_SHA)
  );
  scm.getFileJson = async (name, ref) => {
    if (ref === "main" && name === "release-please-config.json") {
      return state.config;
    }
    if (ref === "main" && name === ".release-please-manifest.json") {
      return state.manifest;
    }
    return github.getFileJson(name, ref);
  };
  const manifest = await Manifest.fromManifest(
    scm,
    "main",
    undefined,
    undefined,
    {
      // A deferred refresh must not leave another PR mutation running in parallel.
      sequentialCalls: true,
    }
  );
  const releases = await manifest.buildReleases();
  assertReleaseCandidates(releases, state.inventory, state.manifest);
  // Freeze checked candidates: createReleases must not re-read an unchecked
  // override or a newly merged PR between validation and the write.
  manifest.buildReleases = async () => releases;
  const created = await manifest.createReleases();
  const candidates = publicationCandidates(created, state.inventory);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `candidates=${JSON.stringify(candidates)}\n`
    );
  }
  try {
    const pullRequests = await manifest.buildPullRequests();
    assertStablePullRequests(pullRequests, state);
    manifest.buildPullRequests = async () => pullRequests;
    await manifest.createPullRequests();
  } catch (error) {
    if (!(error instanceof SupersededSnapshot)) {
      throw error;
    }
    // Already-created tags still need publication even when their following PR
    // refresh was superseded. A failed job would discard these candidates.
    console.log(error.message);
  }
  return candidates;
}

async function main() {
  const state = readReleaseState(ROOT);
  validateConfig({ ...state, requireReady: true });
  assert.equal(process.env.GITHUB_REPOSITORY, state.inventory.repository);
  assert.equal(process.env.GITHUB_REF, "refs/heads/main");
  assert(
    SHA.test(process.env.GITHUB_SHA || ""),
    "Workflow revision is required"
  );
  assert(
    process.env.GH_TOKEN,
    "A repository-scoped release GitHub App token is required"
  );
  assert(
    /^[a-z0-9-]+\[bot\]$/i.test(process.env.SDK_RELEASE_BOT_LOGIN || ""),
    "Configure SDK_RELEASE_BOT_LOGIN for the repository release App"
  );
  assert(
    process.env.SDK_RELEASE_APP_SLUG,
    "Pass the token action app-slug output as SDK_RELEASE_APP_SLUG"
  );
  assert.equal(
    process.env.SDK_RELEASE_BOT_LOGIN,
    `${process.env.SDK_RELEASE_APP_SLUG}[bot]`,
    "Configured release bot must match the App issuing the token"
  );
  const { GitHub, Manifest, VERSION } = require("release-please");
  assert.equal(VERSION, state.inventory.releasePlease.version);
  const [owner, repo] = state.inventory.repository.split("/");
  const github = await GitHub.create({
    owner,
    repo,
    token: process.env.GH_TOKEN,
    defaultBranch: "main",
  });
  const candidates = await orchestrate({ github, state, Manifest });
  console.log(
    `Created ${candidates.length} SDK publication candidates; maintained release PRs.`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = {
  assertStablePullRequests,
  assertReleaseCandidates,
  publicationCandidates,
  orchestrate,
};
