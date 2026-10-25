#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ROOT = path.resolve(__dirname, "../..");
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SHA = /^[a-f0-9]{40}$/;
const ACTIVE = ["elixir", "js", "rust"];
const DISABLED = ["csharp", "go", "kotlin", "ocaml", "php", "python", "swift"];

function readReleaseState(root = ROOT) {
  const read = (name) =>
    JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  return {
    inventory: read(".github/sdk-release-inventory.json"),
    config: read("release-please-config.json"),
    manifest: read(".release-please-manifest.json"),
  };
}

function compareVersions(left, right) {
  assert(
    STABLE.test(left) && STABLE.test(right),
    "Only stable semantic versions are supported"
  );
  const a = left.split(".").map(BigInt);
  const b = right.split(".").map(BigInt);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] > b[i] ? 1 : -1;
    }
  }
  return 0;
}

function validateConfig({ inventory, config, manifest, requireReady = false }) {
  assert.equal(
    inventory.schemaVersion,
    1,
    "Unsupported release inventory schema"
  );
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
    config["release-as"],
    undefined,
    "Version overrides must not bypass Conventional Commits"
  );
  for (const key of [
    "prerelease-type",
    "versioning",
    "initial-version",
    "skip-github-release",
    "extra-files",
    "exclude-paths",
  ]) {
    assert.equal(config[key], undefined, `Unsupported release override ${key}`);
  }
  assert.equal(
    config["last-release-sha"],
    undefined,
    "Use a reviewed bootstrap boundary for initial adoption"
  );
  assert.deepEqual(
    inventory.clients
      .filter((c) => c.enabled)
      .map((c) => c.id)
      .sort(),
    ACTIVE
  );
  assert.deepEqual(
    inventory.clients
      .filter((c) => !c.enabled)
      .map((c) => c.id)
      .sort(),
    DISABLED
  );
  const components = [
    ...inventory.clients.filter((c) => c.enabled),
    ...inventory.internalComponents,
  ];
  assert.equal(inventory.internalComponents.length, 1);
  assert.equal(inventory.internalComponents[0].id, "types");
  assert.equal(
    inventory.internalComponents[0].publish,
    false,
    "Internal types must never be published"
  );
  assert.equal(
    new Set(inventory.clients.map((c) => c.id)).size,
    inventory.clients.length
  );
  assert.equal(
    new Set(components.map((c) => c.component)).size,
    components.length,
    "Component tags must be unique"
  );
  assert.deepEqual(
    Object.keys(config.packages).sort(),
    components.map((c) => c.directory).sort(),
    "Disabled clients must not generate release PRs"
  );
  assert.deepEqual(config.plugins, [
    {
      type: "linked-versions",
      groupName: "js-types",
      components: ["client-js", "client-types"],
      merge: true,
    },
  ]);
  for (const component of components) {
    const configured = config.packages[component.directory];
    assert.equal(configured.component, component.component);
    assert.equal(configured["release-type"], component.releaseType);
    assert.equal(component.tagTemplate, `${component.component}-v{version}`);
    for (const key of [
      "release-as",
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
  }
  for (const client of inventory.clients) {
    if (client.baseline?.minimumAutomatedVersion !== undefined) {
      assert(
        STABLE.test(client.baseline.minimumAutomatedVersion),
        `Invalid automated version floor for ${client.id}`
      );
    }
    if (client.id === "js") {
      assert(
        compareVersions(client.baseline.minimumAutomatedVersion, "2.0.0") >= 0,
        "Known JS subclass type incompatibility requires automated versions >=2.0.0"
      );
    }
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
    if (!client.enabled) {
      assert(
        !(client.directory in manifest),
        `Disabled manifest component ${client.id}`
      );
    }
  }
  for (const [directory, version] of Object.entries(manifest)) {
    assert(
      directory in config.packages,
      `Unconfigured manifest component ${directory}`
    );
    assert(
      STABLE.test(version),
      `Unsupported manifest version for ${directory}: ${version}`
    );
  }
  if ("clients/js" in manifest || "packages/types" in manifest) {
    assert.equal(
      manifest["clients/js"],
      manifest["packages/types"],
      "JS and types must start aligned"
    );
  }
  if (requireReady || inventory.automation.enabled) {
    assert.equal(
      inventory.automation.enabled,
      true,
      inventory.automation.reason || "Release automation is disabled"
    );
    assert(
      SHA.test(inventory.automation.historyBoundary || ""),
      "An explicit verified history boundary is required"
    );
    assert.equal(config["bootstrap-sha"], inventory.automation.historyBoundary);
    assert.deepEqual(
      Object.keys(manifest).sort(),
      components.map((c) => c.directory).sort(),
      "Seed every active/internal version before activation"
    );
    for (const client of inventory.clients.filter((c) => c.enabled)) {
      assert.equal(
        client.baseline.verified,
        true,
        `Unverified ${client.id} source/registry baseline`
      );
      assert.equal(
        client.baseline.ownershipVerified,
        true,
        `Unverified ${client.id} publishing authority`
      );
      if (client.id === "js") {
        assert.equal(
          client.baseline.publicTypeCompatibilityReviewed,
          true,
          "JS public type compatibility and major release requirement must be reviewed"
        );
        assert.equal(
          client.baseline.licenseConfirmed,
          true,
          "JS package license intent must be confirmed before activation"
        );
      }
      assert(
        SHA.test(client.baseline.sourceRevision || ""),
        `Unverified ${client.id} source revision`
      );
      assert(
        compareVersions(
          client.baseline.manifestVersion,
          client.baseline.registryVersion
        ) >= 0,
        `Baseline would downgrade ${client.id}`
      );
      assert(
        compareVersions(
          manifest[client.directory],
          client.baseline.manifestVersion
        ) >= 0,
        `Manifest would downgrade ${client.id} below its reviewed baseline`
      );
    }
  } else {
    assert.equal(inventory.automation.enabled, false);
    // An empty manifest is deliberate while source adoption is unresolved. Never let
    // Release Please treat its fallback initial version/all history as a baseline.
    assert.equal(
      config["bootstrap-sha"],
      undefined,
      "Record reviewed history in the inventory before activation"
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
