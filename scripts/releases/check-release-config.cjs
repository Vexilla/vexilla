#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const {
  STABLE,
  compareVersions,
  managedComponents,
  publishingClients,
  validateParticipation,
  assertPolicyVersion,
} = require("./release-policy.cjs");
const ROOT = path.resolve(__dirname, "../..");
const SHA = /^[a-f0-9]{40}$/;

function readReleaseState(root = ROOT) {
  const read = (name) =>
    JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  return {
    inventory: read(".github/sdk-release-inventory.json"),
    config: read("release-please-config.json"),
    manifest: read(".release-please-manifest.json"),
  };
}

function validateConfig({ inventory, config, manifest, requireReady = false }) {
  validateParticipation(inventory);
  assert.equal(inventory.repository, "Vexilla/vexilla");
  assert.equal(
    inventory.releasePlease.version,
    require("./package.json").dependencies["release-please"]
  );
  assert.equal(
    config["separate-pull-requests"],
    true,
    "Native releases need independent PRs"
  );
  assert.equal(config["include-component-in-tag"], true);
  assert.equal(config["include-v-in-tag"], true);
  assert.equal(config["tag-separator"], "-");
  assert.equal(config.prerelease, false);
  assert.equal(
    config["group-pull-request-title-pattern"],
    "chore${scope}: release js-types libraries",
    "Linked JS/types release titles must roundtrip through the release parser"
  );
  for (const key of [
    "release-as",
    "prerelease-type",
    "versioning",
    "initial-version",
    "skip-github-release",
    "extra-files",
    "exclude-paths",
    "last-release-sha",
  ]) {
    assert.equal(config[key], undefined, `Unsupported release override ${key}`);
  }
  const components = managedComponents(inventory);
  const jsManaged = components.some((c) => c.id === "js");
  assert.equal(
    new Set(
      [...inventory.clients, ...inventory.internalComponents].map(
        (c) => c.component
      )
    ).size,
    inventory.clients.length + inventory.internalComponents.length,
    "Component tags must be unique"
  );
  assert.deepEqual(
    Object.keys(config.packages).sort(),
    components.map((c) => c.directory).sort(),
    "Release Please packages must match managed components"
  );
  assert.deepEqual(
    Object.keys(manifest).sort(),
    components.map((c) => c.directory).sort(),
    "Managed manifest membership must match managed components"
  );
  assert.deepEqual(
    config.plugins,
    jsManaged
      ? [
          {
            type: "linked-versions",
            groupName: "js-types",
            components: ["client-js", "client-types"],
            merge: true,
          },
        ]
      : [],
    "Linked-version configuration must match JS/types management"
  );
  for (const component of components) {
    const configured = config.packages[component.directory];
    assert.equal(configured.component, component.component);
    assert.equal(configured["release-type"], component.releaseType);
    assert.equal(component.tagTemplate, `${component.component}-v{version}`);
    for (const key of [
      "release-as",
      "initial-version",
      "prerelease-type",
      "versioning",
      "skip-github-release",
      "include-component-in-tag",
      "include-v-in-tag",
      "tag-separator",
      "extra-files",
      "exclude-paths",
    ]) {
      assert.equal(
        configured[key],
        undefined,
        `Unsupported per-component override ${key}`
      );
    }
    assert(!configured.prerelease, "Prerelease configuration is unsupported");
    const version = manifest[component.directory];
    assert(
      STABLE.test(version),
      `Unsupported manifest version for ${component.directory}: ${version}`
    );
    const { firstReleaseTarget: target, managementSeed: seed } =
      component.release;
    if (target !== undefined) {
      assert.equal(
        target,
        `${inventory.versionPolicy.major}.0.0`,
        `${component.id} firstReleaseTarget is stale for policy major ${inventory.versionPolicy.major}; revise adoption plan`
      );
      assert(
        STABLE.test(seed),
        `Missing reviewed management seed for ${component.id}`
      );
      assert(
        compareVersions(seed, target) < 0,
        `Management seed must precede first target for ${component.id}`
      );
    }
    if (target && compareVersions(version, target) < 0) {
      assert.equal(
        version,
        seed,
        `${component.id} pre-major version must equal its explicit management seed`
      );
      // Initial major-2 adoption uses truthful 1.x seeds. A future transition
      // requires managed groups already on the immediately preceding major.
      assert.equal(
        Number(version.split(".")[0]),
        inventory.versionPolicy.major - 1,
        `${component.id} seed requires a revised current-major adoption plan`
      );
    } else {
      assertPolicyVersion(inventory, component, version, {
        firstRelease: false,
      });
    }
  }
  if (jsManaged) {
    assert.equal(
      manifest["clients/js"],
      manifest["packages/types"],
      "JS and types must start aligned"
    );
  }
  for (const client of inventory.clients) {
    assert(
      client.publish.definition && client.publish.registry,
      `Missing native definition for ${client.id}`
    );
    assert(
      client.publish.activationPrerequisites.length > 0,
      `Missing activation prerequisites for ${client.id}`
    );
    assert(Array.isArray(client.publish.commands.validate));
    assert(Array.isArray(client.publish.commands.package));
  }
  assert.equal(typeof inventory.automation.enabled, "boolean");
  if (requireReady) {
    assert.equal(
      inventory.automation.enabled,
      true,
      inventory.automation.reason || "Release automation is disabled"
    );
  }
  // Management may be prepared while the global gate remains stopped, but it
  // must never imply acceptance of unresolved source/history evidence.
  if (components.length || inventory.automation.historyBoundary !== null) {
    assert(
      SHA.test(inventory.automation.historyBoundary || ""),
      "An explicit verified history boundary is required"
    );
    assert.equal(config["bootstrap-sha"], inventory.automation.historyBoundary);
  } else {
    assert.equal(
      config["bootstrap-sha"],
      undefined,
      "Record reviewed history in the inventory before adoption"
    );
  }
  for (const client of inventory.clients.filter((c) => c.release.managed)) {
    const baseline = client.baseline || {};
    assert.equal(
      baseline.verified,
      true,
      `Unverified ${client.id} source/registry baseline`
    );
    assert(
      SHA.test(baseline.adoptionSourceRevision || ""),
      `Unverified ${client.id} adoption source revision`
    );
    assert(
      SHA.test(baseline.sourceRevision || "") ||
        (baseline.sourceRevision === null &&
          baseline.artifactComparisonAccepted === true &&
          baseline.historicalSourceUncertaintyAccepted === true),
      `Unverified ${client.id} historical source correspondence or artifact-based acceptance`
    );
    if (client.id === "js") {
      assert.equal(
        baseline.publicTypeCompatibilityReviewed,
        true,
        "JS public type compatibility and major release requirement must be reviewed"
      );
      assert.equal(
        baseline.licenseConfirmed,
        true,
        "JS package license intent must be confirmed before adoption"
      );
    }
    assert(
      compareVersions(baseline.manifestVersion, baseline.registryVersion) >= 0,
      `Baseline would downgrade ${client.id}`
    );
    assert(
      compareVersions(manifest[client.directory], baseline.manifestVersion) >=
        0,
      `Manifest would downgrade ${client.id} below its reviewed baseline`
    );
  }
  for (const client of publishingClients(inventory)) {
    assert.equal(
      client.baseline.ownershipVerified,
      true,
      `Unverified ${client.id} publishing authority`
    );
    assert.equal(
      client.publish.trustVerified,
      true,
      `Unverified ${client.id} trusted publisher configuration`
    );
    assert.equal(
      client.publish.preflightVerified,
      true,
      `Unverified ${client.id} hosted preflight`
    );
  }
  return {
    ready: inventory.automation.enabled,
    components: components.map((c) => c.component),
  };
}

if (require.main === module) {
  try {
    const result = validateConfig({
      ...readReleaseState(),
      requireReady: process.argv.includes("--require-ready"),
    });
    console.log(
      `Release configuration valid; automation ${
        result.ready ? "enabled" : "blocked pending verified adoption"
      }.`
    );
  } catch (error) {
    console.error(`Release configuration rejected: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = {
  ROOT,
  STABLE,
  SHA,
  readReleaseState,
  compareVersions,
  validateConfig,
};
