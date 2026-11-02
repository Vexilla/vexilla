#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");
const { applyReleaseInputs } = require("./release-inputs.cjs");
const {
  managedComponents,
  publishingClients,
  assertPolicyVersion,
} = require("./release-policy.cjs");
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
      const components = managedComponents(state.inventory);
      for (const entry of pr.body.releaseData) {
        const component = components.find(
          (c) => c.component === entry.component
        );
        assert(
          component && entry.version,
          `Release PR has unmanaged component ${entry.component}`
        );
        const version = entry.version.toString();
        assertPolicyVersion(state.inventory, component, version, {
          currentVersion: state.manifest[component.directory],
        });
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
  const components = managedComponents(inventory);
  for (const release of releases) {
    const component = components.find((c) => c.directory === release.path);
    assert(
      component,
      `Release for disabled/unmanaged component: ${release.path}`
    );
    const version = release.tag.version.toString();
    assert(STABLE.test(version), `Unsupported release version: ${version}`);
    assertPolicyVersion(inventory, component, version, { firstRelease: false });
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
    const sdk = publishingClients(inventory).find(
      (client) => client.directory === release.path
    );
    if (!sdk) {
      return [];
    }
    assert(STABLE.test(release.version), "Publication version must be stable");
    assertPolicyVersion(inventory, sdk, release.version, {
      firstRelease: false,
    });
    assertMinimumVersion(sdk, release.version);
    assert.equal(
      release.tagName,
      sdk.tagTemplate.replace("{version}", release.version)
    );
    assert(SHA.test(release.sha));
    return [{ sdk: sdk.id, tag: release.tagName, revision: release.sha }];
  });
}

// Scope the pinned manifest to one independent group. JS/types keep their
// linked plugin; no other group can participate in or fail that proposal.
function groupState(state, components) {
  const directories = new Set(components.map((c) => c.directory));
  return {
    inventory: {
      ...state.inventory,
      clients: state.inventory.clients.map((client) => ({
        ...client,
        release: {
          ...client.release,
          managed: client.release.managed && directories.has(client.directory),
        },
        publish: {
          ...client.publish,
          enabled: client.publish.enabled && directories.has(client.directory),
        },
      })),
      internalComponents: state.inventory.internalComponents.map(
        (component) => ({
          ...component,
          release: {
            ...component.release,
            managed:
              component.release.managed && directories.has(component.directory),
          },
        })
      ),
    },
    config: {
      ...state.config,
      packages: Object.fromEntries(
        Object.entries(state.config.packages).filter(([directory]) =>
          directories.has(directory)
        )
      ),
      plugins: components.some((c) => c.id === "js")
        ? state.config.plugins
        : [],
    },
    manifest: Object.fromEntries(
      Object.entries(state.manifest).filter(([directory]) =>
        directories.has(directory)
      )
    ),
  };
}

function writeOutcomes(result) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `candidates=${JSON.stringify(result.candidates)}\n` +
        `failures=${JSON.stringify(result.failures)}\n`
    );
  }
}

async function orchestrate({ github, state, Manifest }) {
  // Structural corruption is fatal before any registry/release mutation.
  validateConfig({ ...state, requireReady: true });
  const result = { candidates: [], failures: [], outcomes: [] };
  const groups = new Map();
  for (const component of managedComponents(state.inventory)) {
    if (!groups.has(component.releaseGroup)) {
      groups.set(component.releaseGroup, []);
    }
    groups.get(component.releaseGroup).push(component);
  }
  const manifests = [];
  const failed = (group, phase, error) => {
    result.failures.push({ group, phase, message: error.message });
    result.outcomes.push({ group, phase, status: "failed" });
  };
  for (const [group, components] of groups) {
    try {
      const scoped = groupState(state, components);
      const scm = applyReleaseInputs(
        releaseSnapshot(github, process.env.GITHUB_SHA),
        scoped.inventory
      );
      scm.getFileJson = async (name, ref) => {
        if (ref === "main" && name === "release-please-config.json") {
          return scoped.config;
        }
        if (ref === "main" && name === ".release-please-manifest.json") {
          return scoped.manifest;
        }
        return github.getFileJson(name, ref);
      };
      const manifest = await Manifest.fromManifest(
        scm,
        "main",
        undefined,
        undefined,
        { sequentialCalls: true }
      );
      const releases = await manifest.buildReleases();
      assertReleaseCandidates(releases, state.inventory, state.manifest);
      manifest.buildReleases = async () => releases;
      const created = await manifest.createReleases();
      result.candidates.push(
        ...publicationCandidates(created, state.inventory)
      );
      result.outcomes.push({ group, phase: "releases", status: "success" });
      manifests.push({ group, manifest });
    } catch (error) {
      failed(group, "releases", error);
    }
  }
  for (const { group, manifest } of manifests) {
    try {
      const pullRequests = await manifest.buildPullRequests();
      assertStablePullRequests(pullRequests, state);
      manifest.buildPullRequests = async () => pullRequests;
      await manifest.createPullRequests();
      result.outcomes.push({ group, phase: "proposals", status: "success" });
    } catch (error) {
      if (error instanceof SupersededSnapshot) {
        result.outcomes.push({
          group,
          phase: "proposals",
          status: "deferred",
          message: error.message,
        });
      } else {
        failed(group, "proposals", error);
      }
    }
  }
  // Group diagnostics are consumed by a separate required job. Returning a
  // structured failure here lets successful candidates reach their own gates.
  writeOutcomes(result);
  return result;
}

async function main() {
  assert.equal(
    process.env.SDK_RELEASES_ENABLED,
    "true",
    "SDK_RELEASES_ENABLED must permit release generation"
  );
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
  const result = await orchestrate({ github, state, Manifest });
  console.log(JSON.stringify(result, null, 2));
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
  groupState,
};
