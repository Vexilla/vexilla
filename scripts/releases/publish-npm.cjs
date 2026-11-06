const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { digest, checkCandidate } = require("./candidate.cjs");
const { authorizeCurrent } = require("./current-policy.cjs");
// npm 12.2.1 hides OIDC failures behind ENEEDAUTH. Its debug log records
// the actual stage, but can also contain credentials: emit only fixed labels
// and strictly parsed versions/statuses, never raw messages, bodies or URLs.
function npmDiagnostics(log) {
  const result = { oidc: "unobserved" };
  const events = new Set();
  const stages = [
    [
      "Skipped because incorrect permissions for id-token within GitHub workflow",
      "github-permission-missing",
    ],
    [
      "Failed to fetch id_token from GitHub: received an invalid response",
      "github-request-failed",
    ],
    [
      "Failed to fetch id_token from GitHub: missing value",
      "github-token-missing",
    ],
    ["Skipped because no id_token available", "github-token-unavailable"],
    ["Failed token exchange request with body message:", "exchange-rejected"],
    [
      "Failed because token exchange was missing the token in the response body",
      "exchange-token-missing",
    ],
    ["Successfully retrieved and set token", "exchange-succeeded"],
    ["Failure with message:", "oidc-runtime-error"],
  ];
  for (const line of log.split(/\r?\n/)) {
    // Multiline response bodies repeat the same event ID and log prefix.
    // Only the first physical line is an npm-authored diagnostic message.
    const event = line.match(/^\d+ /)?.[0];
    if (!event || events.has(event)) continue;
    events.add(event);
    const version = line.match(/^\d+ info using (npm|node)@v?(\d+\.\d+\.\d+)$/);
    if (version) result[version[1]] = version[2];
    const status = line.match(
      /^\d+ http fetch POST ([1-5]\d\d) https:\/\/registry\.npmjs\.org\/-\/npm\/v1\/oidc\/token\/exchange\/package\/\S+ /
    );
    if (status) result.exchangeHttpStatus = Number(status[1]);
    const message = line.match(/^\d+ (?:verbose|silly) oidc (.*)$/)?.[1];
    const stage = stages.find(([prefix]) => message?.startsWith(prefix));
    if (stage) result.oidc = stage[1];
  }
  return result;
}
function uploadNpm(artifact, run = spawnSync) {
  const logs = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-npm-publish-"));
  try {
    const result = run(
      "npm",
      [
        "publish",
        artifact,
        "--ignore-scripts",
        "--access",
        "public",
        "--registry=https://registry.npmjs.org",
        "--logs-dir=" + logs,
        "--logs-max=1",
      ],
      { stdio: "inherit" }
    );
    if (result.status !== 0) {
      let diagnostic = { oidc: "unavailable" };
      try {
        diagnostic = npmDiagnostics(
          fs
            .readdirSync(logs)
            .filter((name) => name.endsWith(".log"))
            .map((name) => fs.readFileSync(path.join(logs, name), "utf8"))
            .join("\n")
        );
      } catch {
        /* Missing logs must not hide the original upload failure. */
      }
      // publish() reports this only if registry integrity cannot reconcile it.
      throw Error(
        "npm publish failed; check trusted publisher workflow sdk-release.yml and environment sdk-npm; diagnostics: " +
          JSON.stringify(diagnostic)
      );
    }
  } finally {
    fs.rmSync(logs, { recursive: true, force: true });
  }
}
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
async function publish(
  candidate,
  directory,
  request = fetch,
  upload,
  authorize = authorizeCurrent
) {
  await authorize(candidate.sdk, candidate.version);
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
  await authorize(candidate.sdk, candidate.version); // Recheck current stop policy before npm requests OIDC.
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
module.exports = { registryState, publish, npmDiagnostics, uploadNpm };
if (require.main === module) {
  (async () => {
    const directory = path.resolve(process.argv[2]);
    const identity = JSON.parse(fs.readFileSync(process.argv[3]));
    const candidate = JSON.parse(
      fs.readFileSync(path.join(directory, "candidate.json"))
    );
    const policy = await authorizeCurrent(candidate.sdk, candidate.version);
    checkCandidate(candidate, identity, directory, policy.inventory);
    let publicationPolicy = policy;
    const outcome = await publish(
      candidate,
      directory,
      fetch,
      async () => {
        uploadNpm(path.join(directory, candidate.artifact));
      },
      async (sdk, version) => {
        publicationPolicy = await authorizeCurrent(sdk, version);
        return publicationPolicy;
      }
    );
    console.log(outcome);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `\nRegistry: npm ${outcome}\nSource revision: ${candidate.revision}; current authorization policy: ${publicationPolicy.policyRevision}\n`
      );
    }
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
