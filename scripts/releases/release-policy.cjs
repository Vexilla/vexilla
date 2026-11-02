"use strict";

const assert = require("node:assert/strict");
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const SUPPORTED = Object.freeze(["elixir", "js", "rust"]);
const DORMANT = Object.freeze([
  "csharp",
  "go",
  "kotlin",
  "ocaml",
  "php",
  "python",
  "swift",
]);

function compareVersions(left, right) {
  assert(
    STABLE.test(left) && STABLE.test(right),
    "Only stable semantic versions are supported"
  );
  const a = left.split(".").map(BigInt);
  const b = right.split(".").map(BigInt);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] > b[i] ? 1 : -1;
    }
  }
  return 0;
}

function validateParticipation(inventory) {
  assert.equal(
    inventory.schemaVersion,
    2,
    "Unsupported release inventory schema"
  );
  assert(
    Number.isSafeInteger(inventory.versionPolicy?.major) &&
      inventory.versionPolicy.major > 0,
    "versionPolicy.major must be a positive integer"
  );
  assert(
    Array.isArray(inventory.clients) &&
      Array.isArray(inventory.internalComponents)
  );
  assert.deepEqual(
    inventory.clients.map((c) => c.id).sort(),
    [...SUPPORTED, ...DORMANT].sort(),
    "Release inventory must preserve implemented and dormant SDKs"
  );
  assert.equal(inventory.internalComponents.length, 1);
  const types = inventory.internalComponents[0];
  assert.equal(types.id, "types");
  assert.equal(types.publish, false, "Internal types must never be published");
  for (const client of inventory.clients) {
    assert.equal(
      client.enabled,
      undefined,
      "Use release.managed and publish.enabled"
    );
    assert.equal(
      typeof client.release?.managed,
      "boolean",
      `Missing management state for ${client.id}`
    );
    assert.equal(
      typeof client.publish?.enabled,
      "boolean",
      `Missing publication state for ${client.id}`
    );
    assert(
      !client.publish.enabled || client.release.managed,
      `Publication-enabled ${client.id} must be managed`
    );
    assert(
      SUPPORTED.includes(client.id) ||
        (!client.release.managed && !client.publish.enabled),
      `Dormant SDK ${client.id} has no implemented publishing route`
    );
  }
  assert.equal(
    typeof types.release?.managed,
    "boolean",
    "Missing types management state"
  );
  const js = inventory.clients.find((c) => c.id === "js");
  assert.equal(
    types.release.managed,
    js.release.managed,
    "JS/types must enter and leave management together"
  );
  if (js.release.managed) {
    assert.equal(
      types.release.firstReleaseTarget,
      js.release.firstReleaseTarget,
      "JS/types first targets must agree"
    );
    assert.equal(
      types.release.managementSeed,
      js.release.managementSeed,
      "JS/types management seeds must agree"
    );
  }
  return inventory;
}

function managedComponents(inventory) {
  validateParticipation(inventory);
  return [...inventory.clients, ...inventory.internalComponents].filter(
    (c) => c.release.managed
  );
}
function publishingClients(inventory) {
  validateParticipation(inventory);
  return inventory.clients.filter(
    (c) => c.release.managed && c.publish.enabled
  );
}
function selectComponents(inventory, { publishOnly = false } = {}) {
  return publishOnly
    ? publishingClients(inventory)
    : managedComponents(inventory);
}
function clientForPolicy(inventory, id, { publish = true } = {}) {
  validateParticipation(inventory);
  const client = inventory.clients.find((c) => c.id === id);
  assert(
    client &&
      SUPPORTED.includes(id) &&
      client.release.managed &&
      (!publish || client.publish.enabled),
    `SDK is not managed${publish ? " and enabled for publishing" : ""}: ${id}`
  );
  return client;
}

// Current policy decides the allowed major. An optional pre-update version
// decides whether an initial target is still pending. Tagged source manifests
// already contain their approved version, so tag verification supplies no seed.
function assertPolicyVersion(
  inventory,
  component,
  version,
  { currentVersion, firstRelease = true } = {}
) {
  assert(
    STABLE.test(version),
    `Unsupported stable release version: ${version}`
  );
  const major = inventory.versionPolicy?.major;
  assert(
    Number.isSafeInteger(major) && major > 0,
    "Invalid versionPolicy.major"
  );
  assert(
    BigInt(version.split(".")[0]) === BigInt(major),
    `${component.id} release ${version} must use configured major ${major}; review a coordinated major transition`
  );
  const target = component.release?.firstReleaseTarget;
  if (
    firstRelease &&
    currentVersion !== undefined &&
    target &&
    compareVersions(currentVersion, target) < 0
  ) {
    assert.equal(
      target,
      `${major}.0.0`,
      `${component.id} firstReleaseTarget is stale for policy major ${major}; revise adoption plan`
    );
    assert.equal(
      version,
      target,
      `${component.id} first automated release must be exactly ${target}, received ${version}`
    );
  }
  return version;
}

module.exports = {
  STABLE,
  SUPPORTED,
  DORMANT,
  compareVersions,
  validateParticipation,
  managedComponents,
  publishingClients,
  selectComponents,
  clientForPolicy,
  publicationClient: clientForPolicy,
  assertPolicyVersion,
  assertReleaseVersion: (inventory, component, version, currentVersion) =>
    assertPolicyVersion(inventory, component, version, { currentVersion }),
};
