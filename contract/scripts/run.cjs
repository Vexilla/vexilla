const fs = require("node:fs");
const path = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");
const { checkInventory, verifyArtifacts } = require("./gate.cjs");
const { readVectors } = require("./vectors.cjs");
const { checkObservations } = require("./observations.cjs");
const { isDeepStrictEqual } = require("node:util");
const os = require("node:os");
const inventory = require("../inventory.json");
checkInventory(inventory);
const sdk = inventory.find((s) => s.id === process.argv[2]);
if (!sdk) {
  throw Error("Choose an SDK: " + inventory.map((s) => s.id).join(", "));
}
const root = path.resolve(__dirname, "../..");
const dir = path.resolve(
  process.env.VEXILLA_CONTRACT_DIR || path.join(root, ".contract-artifacts")
);
const receiptDir = path.resolve(
  process.env.VEXILLA_RECEIPT_DIR || path.join(dir, "receipts")
);
fs.mkdirSync(receiptDir, { recursive: true });
const receipt = path.join(receiptDir, sdk.id + ".json");
fs.rmSync(receipt, { force: true });
const metadata = verifyArtifacts(dir);
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
if (metadata.revision !== revision) {
  throw Error("Artifact source revision does not match this checkout");
}
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-observations-"));
const observationsFile = path.join(scratch, "observations.json");
const [command, ...args] = [
  ...JSON.parse(process.env.VEXILLA_CONTRACT_LAUNCHER || "[]"),
  ...sdk.command,
];
// The native command starts its own test runner; do not inherit an outer Node test process.
const nativeEnvironment = { ...process.env };
delete nativeEnvironment.NODE_TEST_CONTEXT;
const result = spawnSync(command, args, {
  cwd: path.join(root, sdk.directory),
  stdio: "inherit",
  env: {
    ...nativeEnvironment,
    VEXILLA_CONTRACT_DIR: dir,
    PYTHONPATH: path.join(root, "clients/python"),
    VEXILLA_OBSERVATIONS_FILE: observationsFile,
  },
});
if (result.error) {
  fs.rmSync(scratch, { recursive: true, force: true });
  throw result.error;
}
if (result.status !== 0) {
  fs.rmSync(scratch, { recursive: true, force: true });
  process.exit(result.status || 1);
}
try {
  if (!isDeepStrictEqual(metadata, verifyArtifacts(dir))) {
    throw Error("Native consumer changed artifact metadata");
  }
  const coverage = checkObservations(
    sdk.id,
    readVectors(dir),
    JSON.parse(fs.readFileSync(observationsFile, "utf8"))
  );
  fs.writeFileSync(
    receipt,
    JSON.stringify(
      { sdk: sdk.id, status: "success", ...metadata, coverage },
      null,
      2
    )
  );
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
