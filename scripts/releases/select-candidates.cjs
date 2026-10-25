const fs = require("node:fs");
const { clientFor, parseTag } = require("./release-identity.cjs");
function selectCandidates(inventory, candidates, recoverySDK, recoveryTag) {
  const selected = recoverySDK
    ? [{ sdk: recoverySDK, tag: recoveryTag, revision: "" }]
    : candidates;
  if (!Array.isArray(selected) || selected.length > 3) {
    throw Error("Invalid release output");
  }
  const seen = new Set();
  return selected.map((candidate) => {
    const client = clientFor(inventory, candidate.sdk);
    parseTag(client, candidate.tag);
    if (seen.has(client.id)) {
      throw Error("Duplicate release candidate");
    }
    seen.add(client.id);
    if (!recoverySDK && !/^[a-f0-9]{40}$/.test(candidate.revision)) {
      throw Error("Automatic release output is missing immutable revision");
    }
    return { sdk: client.id, tag: candidate.tag, revision: candidate.revision };
  });
}
module.exports = { selectCandidates };
if (require.main === module) {
  if (process.env.SDK_RELEASES_ENABLED !== "true") {
    throw Error(
      "Publication disabled: complete docs/sdk-releases.md rollout before enabling SDK_RELEASES_ENABLED"
    );
  }
  const include = selectCandidates(
    require("../../.github/sdk-release-inventory.json"),
    JSON.parse(process.env.RELEASE_CANDIDATES || "[]"),
    process.env.RECOVERY_SDK,
    process.env.RECOVERY_TAG
  );
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    "matrix=" +
      JSON.stringify({ include }) +
      "\nany=" +
      (include.length > 0) +
      "\n"
  );
}
