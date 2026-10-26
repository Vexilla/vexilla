const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { clientFor, readManifest, parseTag } = require("./release-identity.cjs");
const digest = (bytes, algorithm = "sha256", encoding = "hex") =>
  crypto.createHash(algorithm).update(bytes).digest(encoding);
function checkCandidate(candidate, identity, directory, inventory) {
  const client = clientFor(inventory, identity.sdk);
  for (const field of ["sdk", "package", "version", "tag", "revision"]) {
    if (candidate[field] !== identity[field]) {
      throw Error("Candidate identity mismatch: " + field);
    }
  }
  if (
    candidate.package !== client.publish.package ||
    parseTag(client, candidate.tag) !== candidate.version ||
    !/^[a-f0-9]{40}$/.test(candidate.revision)
  ) {
    throw Error("Invalid candidate identity");
  }
  if (
    !candidate.verification?.package ||
    !candidate.verification?.consumer ||
    !candidate.verification?.native
  ) {
    throw Error("Candidate verification incomplete");
  }
  if (
    !Array.isArray(candidate.files) ||
    !candidate.files.length ||
    new Set(candidate.files.map((f) => f.name)).size !== candidate.files.length
  ) {
    throw Error("Invalid candidate file inventory");
  }
  for (const file of candidate.files) {
    if (
      !/^[A-Za-z0-9_.-]+$/.test(file.name) ||
      file.name === "." ||
      file.name === ".."
    ) {
      throw Error("Invalid candidate path");
    }
    const filename = path.join(directory, file.name);
    if (
      !fs.lstatSync(filename).isFile() ||
      digest(fs.readFileSync(filename)) !== file.sha256
    ) {
      throw Error("Candidate artifact digest mismatch: " + file.name);
    }
  }
  if (!candidate.files.some((f) => f.name === candidate.artifact)) {
    throw Error("Missing verified package artifact");
  }
  return candidate;
}
function createCandidate(identity, directory, inventory) {
  const client = clientFor(inventory, identity.sdk);
  const manifest = readManifest(client);
  if (
    manifest.package !== identity.package ||
    manifest.version !== identity.version
  ) {
    throw Error("Checked-out manifest disagrees with approved identity");
  }
  if (
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
    identity.revision
  ) {
    throw Error("Packaging checkout is not the approved release revision");
  }
  let artifact, files, verification;
  if (identity.sdk === "js") {
    const artifacts = fs
      .readdirSync(directory)
      .filter((f) => f.endsWith(".tgz"));
    if (artifacts.length !== 1) {
      throw Error("Expected exactly one packed npm candidate");
    }
    artifact = artifacts[0];
    files = [artifact];
    verification = { package: true, consumer: true, native: true };
  } else {
    const receipt = JSON.parse(
      fs.readFileSync(path.join(directory, "receipt.json"))
    );
    for (const field of ["sdk", "package", "version", "revision"]) {
      if (receipt[field] !== identity[field]) {
        throw Error("Native receipt identity mismatch: " + field);
      }
    }
    if (
      !receipt.verification?.package ||
      !receipt.verification?.consumer ||
      (identity.sdk === "elixir" && !receipt.verification?.docs)
    ) {
      throw Error("Native package verification incomplete");
    }
    if (
      digest(fs.readFileSync(path.join(directory, receipt.artifact))) !==
      receipt.sha256
    ) {
      throw Error("Native artifact changed");
    }
    artifact = receipt.artifact;
    files = [artifact, "receipt.json"];
    if (receipt.docs) {
      files.push(receipt.docs.artifact);
    }
    verification = { ...receipt.verification, native: true };
  }
  const candidate = {
    ...identity,
    schemaVersion: 1,
    artifact,
    verification,
    files: files.map((name) => ({
      name,
      sha256: digest(fs.readFileSync(path.join(directory, name))),
    })),
  };
  checkCandidate(candidate, identity, directory, inventory);
  fs.writeFileSync(
    path.join(directory, "candidate.json"),
    JSON.stringify(candidate, null, 2) + "\n"
  );
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      `\n### Verified ${candidate.sdk} candidate`,
      `Package: ${candidate.package}@${candidate.version}`,
      `Tag: ${candidate.tag}; revision: ${candidate.revision}`,
      ...candidate.files.map((file) => `${file.name}: SHA256 ${file.sha256}`),
    ];
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      lines.join("\n\n") + "\n"
    );
  }
  return candidate;
}
module.exports = { digest, checkCandidate, createCandidate };
if (require.main === module) {
  const [mode, identityFile, directory] = process.argv.slice(2);
  const identity = JSON.parse(fs.readFileSync(identityFile));
  const inventory = require("../../.github/sdk-release-inventory.json");
  const candidate =
    mode === "create"
      ? createCandidate(identity, directory, inventory)
      : checkCandidate(
          JSON.parse(fs.readFileSync(path.join(directory, "candidate.json"))),
          identity,
          directory,
          inventory
        );
  console.log(JSON.stringify(candidate, null, 2));
}
