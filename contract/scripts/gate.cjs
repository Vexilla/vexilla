const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const { readVectors } = require("./vectors.cjs");
const { checkCoverage } = require("./observations.cjs");
const required = [
  "js",
  "python",
  "go",
  "rust",
  "csharp",
  "swift",
  "kotlin",
  "php",
  "elixir",
  "ocaml",
  "lua",
];
function checkInventory(inventory) {
  const ids = inventory.map((s) => s.id);
  if (
    ids.length !== required.length ||
    new Set(ids).size !== required.length ||
    required.some((id) => !ids.includes(id))
  ) {
    throw Error(
      "Required inventory must contain exactly: " + required.join(", ")
    );
  }
}
function verifyArtifacts(dir) {
  const metadata = JSON.parse(fs.readFileSync(path.join(dir, "metadata.json")));
  for (const requiredFile of [
    "manifest.json",
    "contract-group.json",
    "expected.json",
    "parity.json",
    "compatibility.json",
  ]) {
    if (!metadata.hashes[requiredFile]) {
      throw Error("Missing hash: " + requiredFile);
    }
  }
  for (const [file, hash] of Object.entries(metadata.hashes)) {
    if (path.basename(file) !== file) {
      throw Error("Invalid artifact file name");
    }
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(dir, file)))
      .digest("hex");
    if (hash !== actual) {
      throw Error("Artifact hash mismatch: " + file);
    }
  }
  const caseIds = readVectors(dir)
    .map((sample) => sample.id)
    .sort();
  if (!isDeepStrictEqual(metadata.requiredCaseIds, caseIds)) {
    throw Error("Artifact case inventory mismatch");
  }
  return metadata;
}
function checkGate(inventory, metadata, receipts, producer, consumers) {
  checkInventory(inventory);
  if (producer !== "success" || consumers !== "success") {
    throw Error(
      `Required jobs did not succeed: producer=${producer}, consumers=${consumers}`
    );
  }
  if (
    receipts.length !== required.length ||
    receipts.some((receipt) => !required.includes(receipt.sdk))
  ) {
    throw Error("Unexpected or duplicate consumer receipts");
  }
  for (const id of required) {
    const matches = receipts.filter((r) => r.sdk === id);
    if (matches.length !== 1) {
      throw Error(`Missing or duplicate required consumer: ${id}`);
    }
    const r = matches[0];
    if (
      r.status !== "success" ||
      r.revision !== metadata.revision ||
      !isDeepStrictEqual(r.hashes, metadata.hashes) ||
      !isDeepStrictEqual(r.requiredCaseIds, metadata.requiredCaseIds)
    ) {
      throw Error("Incompatible or unsuccessful consumer: " + id);
    }
    checkCoverage(id, metadata.requiredCaseIds, r.coverage);
  }
  return true;
}
module.exports = { required, checkInventory, verifyArtifacts, checkGate };
if (require.main === module) {
  const root = path.resolve(__dirname, "../..");
  const dir = path.resolve(
    process.env.VEXILLA_CONTRACT_DIR || path.join(root, ".contract-artifacts")
  );
  const metadata = verifyArtifacts(dir);
  const revision =
    process.env.GITHUB_SHA ||
    require("node:child_process")
      .execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      })
      .trim();
  if (metadata.revision !== revision) {
    throw Error("Artifact source revision does not match this checkout");
  }
  const receiptDir = path.resolve(
    process.env.VEXILLA_RECEIPT_DIR || path.join(dir, "receipts")
  );
  const receipts = fs.existsSync(receiptDir)
    ? fs
        .readdirSync(receiptDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => JSON.parse(fs.readFileSync(path.join(receiptDir, f))))
    : [];
  checkGate(
    require("../inventory.json"),
    metadata,
    receipts,
    process.env.PRODUCER_RESULT,
    process.env.CONSUMERS_RESULT
  );
  console.log(
    "Required producer and all eleven SDK contracts passed for " +
      metadata.revision
  );
}
