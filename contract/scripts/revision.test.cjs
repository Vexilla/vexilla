const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync, spawnSync } = require("node:child_process");
const { required } = require("./gate.cjs");
const { requiredRuntimes } = require("./observations.cjs");

test("release evidence follows the checkout when the workflow was triggered at another revision", () => {
  const root = path.resolve(__dirname, "../..");
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const triggerRevision =
    revision === "a".repeat(40) ? "b".repeat(40) : "a".repeat(40);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-revision-"));
  const env = {
    ...process.env,
    GITHUB_SHA: triggerRevision,
    VEXILLA_CONTRACT_DIR: dir,
    VEXILLA_RECEIPT_DIR: path.join(dir, "receipts"),
    EXPECTED_REVISION: revision,
    PRODUCER_RESULT: "success",
    CONSUMERS_RESULT: "success",
  };
  const run = (args, overrides = {}) =>
    spawnSync(process.execPath, args, {
      cwd: root,
      env: { ...env, ...overrides },
      encoding: "utf8",
    });
  const succeeds = (result) => {
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  try {
    succeeds(
      run([
        "--import",
        "./packages/publishing/node_modules/tsx/dist/loader.mjs",
        "contract/scripts/generate.ts",
      ])
    );
    const metadata = JSON.parse(
      fs.readFileSync(path.join(dir, "metadata.json"))
    );
    assert.equal(metadata.revision, revision);

    // Exercise the real wrapper without depending on an SDK toolchain.
    const launcher = path.join(dir, "native.cjs");
    fs.writeFileSync(
      launcher,
      `
      const fs = require("node:fs");
      const { readVectors } = require(${JSON.stringify(
        path.join(__dirname, "vectors.cjs")
      )});
      const observations = readVectors(process.env.VEXILLA_CONTRACT_DIR).map(sample => ({
        caseId: sample.id, outcome: sample.expected
      }));
      fs.writeFileSync(process.env.VEXILLA_OBSERVATIONS_FILE, JSON.stringify({
        protocol: 1, sdk: "js", runs: [{ runtime: "native", observations }]
      }));
    `
    );
    succeeds(
      run(["contract/scripts/run.cjs", "js"], {
        VEXILLA_CONTRACT_LAUNCHER: JSON.stringify([process.execPath, launcher]),
      })
    );
    const receipt = JSON.parse(
      fs.readFileSync(path.join(env.VEXILLA_RECEIPT_DIR, "js.json"))
    );
    assert.equal(receipt.revision, revision);
    for (const sdk of required) {
      fs.writeFileSync(
        path.join(env.VEXILLA_RECEIPT_DIR, sdk + ".json"),
        JSON.stringify({
          ...receipt,
          sdk,
          coverage: requiredRuntimes(sdk).map((runtime) => ({
            runtime,
            caseIds: metadata.requiredCaseIds,
          })),
        })
      );
    }
    succeeds(run(["contract/scripts/gate.cjs"]));
    const unapproved = run(["contract/scripts/gate.cjs"], {
      EXPECTED_REVISION: triggerRevision,
    });
    assert.notEqual(unapproved.status, 0);
    assert.match(unapproved.stderr, /not from the approved revision/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
