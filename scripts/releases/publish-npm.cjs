const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { digest, checkCandidate } = require("./candidate.cjs");
async function registryState(candidate, bytes, request = fetch) {
  const response = await request(
    "https://registry.npmjs.org/" +
      encodeURIComponent(candidate.package) +
      "/" +
      candidate.version,
    { signal: AbortSignal.timeout(30000) }
  );
  if (response.status === 404) {
    return "absent";
  }
  if (!response.ok) {
    throw Error("npm version lookup failed: HTTP " + response.status);
  }
  const data = await response.json();
  const integrity = "sha512-" + digest(bytes, "sha512", "base64");
  if (
    data.name !== candidate.package ||
    data.version !== candidate.version ||
    data.dist?.integrity !== integrity
  ) {
    throw Error(
      "Existing npm version has conflicting or unverifiable integrity"
    );
  }
  return "matching";
}
async function publish(candidate, directory, request = fetch, upload) {
  const bytes = fs.readFileSync(path.join(directory, candidate.artifact));
  if ((await registryState(candidate, bytes, request)) === "matching") {
    return "already published; integrity matches";
  }
  if (
    !process.env.ACTIONS_ID_TOKEN_REQUEST_URL ||
    !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  ) {
    throw Error(
      "npm trusted publishing is not configured: OIDC permission and trust are required"
    );
  }
  if (process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN) {
    throw Error("Long-lived npm credentials are forbidden in this workflow");
  }
  let failure;
  try {
    await upload();
  } catch (error) {
    failure = error;
  }
  // An upload can succeed while its response is lost. Only registry integrity proves success.
  if ((await registryState(candidate, bytes, request)) === "matching") {
    return "published; integrity verified";
  }
  throw (
    failure || Error("npm upload returned without a matching registry artifact")
  );
}
module.exports = { registryState, publish };
if (require.main === module) {
  (async () => {
    const directory = path.resolve(process.argv[2]);
    const identity = JSON.parse(fs.readFileSync(process.argv[3]));
    const candidate = JSON.parse(
      fs.readFileSync(path.join(directory, "candidate.json"))
    );
    checkCandidate(
      candidate,
      identity,
      directory,
      require("../../.github/sdk-release-inventory.json")
    );
    const outcome = await publish(candidate, directory, fetch, async () => {
      const result = spawnSync(
        "npm",
        [
          "publish",
          path.join(directory, candidate.artifact),
          "--ignore-scripts",
          "--access",
          "public",
          "--registry=https://registry.npmjs.org",
        ],
        { stdio: "inherit" }
      );
      if (result.status !== 0) {
        throw Error(
          "npm publish failed; check trusted publisher workflow sdk-release.yml and environment sdk-npm"
        );
      }
    });
    console.log(outcome);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `\nRegistry: npm ${outcome}\n`
      );
    }
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
