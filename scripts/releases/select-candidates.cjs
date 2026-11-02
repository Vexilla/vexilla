const fs = require("node:fs");
const { clientFor, parseTag } = require("./release-identity.cjs");
const { SUPPORTED, publishingClients } = require("./release-policy.cjs");
function selectCandidates(inventory, candidates, recoverySDK, recoveryTag) {
  const selected = recoverySDK
    ? [{ sdk: recoverySDK, tag: recoveryTag, revision: "" }]
    : candidates;
  if (!Array.isArray(selected) || selected.length > 3) {
    throw Error("Invalid release output");
  }
  const publishers = new Set(
    publishingClients(inventory).map((client) => client.id)
  );
  const seen = new Set();
  return selected
    .filter((candidate) => {
      if (recoverySDK) {
        return true;
      }
      if (!SUPPORTED.includes(candidate.sdk)) {
        throw Error(
          "SDK has no implemented publishing route: " + candidate.sdk
        );
      }
      // Current policy may stop or de-manage one SDK after orchestration. Its
      // stale candidate must not discard other still-authorized publishers.
      return publishers.has(candidate.sdk);
    })
    .map((candidate) => {
      const client = clientFor(inventory, candidate.sdk);
      parseTag(client, candidate.tag, inventory);
      if (seen.has(client.id)) {
        throw Error("Duplicate release candidate");
      }
      seen.add(client.id);
      if (!recoverySDK && !/^[a-f0-9]{40}$/.test(candidate.revision)) {
        throw Error("Automatic release output is missing immutable revision");
      }
      return {
        sdk: client.id,
        tag: candidate.tag,
        revision: candidate.revision,
      };
    });
}
module.exports = { selectCandidates };
if (require.main === module) {
  (async () => {
    const policy = await require("./current-policy.cjs").currentPolicy();
    const include = selectCandidates(
      policy.inventory,
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
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
