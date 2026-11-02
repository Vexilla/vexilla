"use strict";

const { validateConfig } = require("./check-release-config.cjs");
const {
  publicationClient,
  assertPolicyVersion,
} = require("./release-policy.cjs");
const SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = "Vexilla/vexilla";

async function githubRequest(route, token = process.env.GH_TOKEN) {
  if (!token) {
    throw Error(
      "GH_TOKEN is required to verify current release policy and approval"
    );
  }
  const response = await fetch("https://api.github.com" + route, {
    headers: {
      authorization: "Bearer " + token,
      accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  if (!response.ok) {
    throw Error(`GitHub verification failed (${response.status}) for ${route}`);
  }
  return response.json();
}
function decodeFile(file, name) {
  if (file.encoding !== "base64" || typeof file.content !== "string") {
    throw Error("Missing policy/source file: " + name);
  }
  return Buffer.from(file.content, "base64").toString("utf8");
}
function validatePolicyContext(
  policy,
  globalSwitch = process.env.SDK_RELEASES_ENABLED
) {
  if (globalSwitch !== "true") {
    throw Error("SDK_RELEASES_ENABLED stops release publication");
  }
  if (!SHA.test(policy?.policyRevision || "")) {
    throw Error("Current policy must identify an immutable main revision");
  }
  if (policy.inventory?.repository !== REPOSITORY) {
    throw Error("Current policy repository mismatch");
  }
  validateConfig({
    inventory: policy.inventory,
    config: policy.config,
    manifest: policy.manifest,
    requireReady: true,
  });
  return policy;
}
async function currentPolicy(
  repository = process.env.GITHUB_REPOSITORY,
  request = githubRequest,
  globalSwitch = process.env.SDK_RELEASES_ENABLED
) {
  if (repository !== REPOSITORY) {
    throw Error("Repository identity mismatch");
  }
  if (globalSwitch !== "true") {
    throw Error("SDK_RELEASES_ENABLED stops release publication");
  }
  const base = "/repos/" + repository;
  const head = await request(base + "/git/ref/heads/main");
  if (head.object?.type !== "commit" || !SHA.test(head.object.sha || "")) {
    throw Error("Cannot resolve current main policy");
  }
  const policyRevision = head.object.sha;
  const files = [
    ".github/sdk-release-inventory.json",
    "release-please-config.json",
    ".release-please-manifest.json",
  ];
  // Pin all policy files to the same revision; never mix moving main reads.
  const values = await Promise.all(
    files.map(async (name) =>
      JSON.parse(
        decodeFile(
          await request(base + "/contents/" + name + "?ref=" + policyRevision),
          name
        )
      )
    )
  );
  return validatePolicyContext(
    {
      policyRevision,
      inventory: values[0],
      config: values[1],
      manifest: values[2],
    },
    globalSwitch
  );
}
function authorizePolicy(
  policy,
  sdk,
  version,
  globalSwitch = process.env.SDK_RELEASES_ENABLED
) {
  validatePolicyContext(policy, globalSwitch);
  const client = publicationClient(policy.inventory, sdk);
  assertPolicyVersion(policy.inventory, client, version, {
    firstRelease: false,
  });
  return client;
}
async function authorizeCurrent(
  sdk,
  version,
  {
    repository = process.env.GITHUB_REPOSITORY,
    request = githubRequest,
    globalSwitch = process.env.SDK_RELEASES_ENABLED,
  } = {}
) {
  const policy = await currentPolicy(repository, request, globalSwitch);
  authorizePolicy(policy, sdk, version, globalSwitch);
  return policy;
}
module.exports = {
  SHA,
  REPOSITORY,
  githubRequest,
  decodeFile,
  validatePolicyContext,
  currentPolicy,
  authorizePolicy,
  authorizeCurrent,
};
