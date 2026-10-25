const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const {
  validatePublication,
} = require("../../packages/publishing/dist/index.js");

test("an incompatible artifact fails a real required SDK and cannot produce a success receipt", () => {
  const root = path.resolve(__dirname, "../..");
  const source = path.resolve(
    process.env.VEXILLA_CONTRACT_DIR || path.join(root, ".contract-artifacts")
  );
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "vexilla-invalid-contract-")
  );
  try {
    for (const f of fs.readdirSync(source).filter((f) => f.endsWith(".json"))) {
      fs.copyFileSync(path.join(source, f), path.join(dir, f));
    }
    const name = "contract-group.json";
    const group = JSON.parse(fs.readFileSync(path.join(dir, name)));
    group.environments.dev.features.toggle.value = "not-a-boolean";
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "manifest.json"))
    );
    assert.equal(
      validatePublication(manifest, { "contract-group": group }).success,
      false
    );
    const content = JSON.stringify(group, null, 2);
    fs.writeFileSync(path.join(dir, name), content);
    const metadata = JSON.parse(
      fs.readFileSync(path.join(dir, "metadata.json"))
    );
    // Even if a faulty producer supplied matching hashes, the actual client assertions must fail.
    metadata.hashes[name] = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");
    fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata));
    const result = spawnSync(
      process.execPath,
      [path.join(root, "contract/scripts/run.cjs"), "js"],
      {
        cwd: root,
        env: {
          ...process.env,
          VEXILLA_CONTRACT_DIR: dir,
          VEXILLA_RECEIPT_DIR: path.join(dir, "receipts"),
          VEXILLA_CONTRACT_LAUNCHER: "[]",
        },
        encoding: "utf8",
      }
    );
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.equal(fs.existsSync(path.join(dir, "receipts/js.json")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
