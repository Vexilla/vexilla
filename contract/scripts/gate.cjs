const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
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
  return metadata;
}
function checkGate(inventory, metadata, receipts, producer, consumers) {
  checkInventory(inventory);
  if (producer !== "success" || consumers !== "success") {
    throw Error(
      `Required jobs did not succeed: producer=${producer}, consumers=${consumers}`
    );
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
      JSON.stringify(r.hashes) !== JSON.stringify(metadata.hashes)
    ) {
      throw Error("Incompatible or unsuccessful consumer: " + id);
    }
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
    "Required producer and all ten SDK contracts passed for " +
      metadata.revision
  );
}
