const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkInventory, verifyArtifacts } = require("./gate.cjs");
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
const metadata = verifyArtifacts(dir);
const receiptDir = path.resolve(
  process.env.VEXILLA_RECEIPT_DIR || path.join(dir, "receipts")
);
fs.mkdirSync(receiptDir, { recursive: true });
const receipt = path.join(receiptDir, sdk.id + ".json");
fs.rmSync(receipt, { force: true });
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
  },
});
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status || 1);
}
verifyArtifacts(dir);
fs.writeFileSync(
  receipt,
  JSON.stringify({ sdk: sdk.id, status: "success", ...metadata }, null, 2)
);
