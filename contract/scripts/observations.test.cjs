const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const {
  checkObservations,
  checkCoverage,
  requiredRuntimes,
} = require("./observations.cjs");
const { readVectors } = require("./vectors.cjs");
const root = path.resolve(__dirname, "../..");
const cases = [
  { id: "positive", expected: { value: 42 } },
  { id: "negative", expected: { error: "validation" } },
];
const result = (sdk) => ({
  protocol: 1,
  sdk,
  runs: requiredRuntimes(sdk).map((runtime) => ({
    runtime,
    observations: cases.map((sample) => ({
      caseId: sample.id,
      outcome: structuredClone(sample.expected),
    })),
  })),
});

test("complete observations compare values and deliberate error categories", () => {
  const coverage = checkObservations("js", cases, result("js"));
  assert.doesNotThrow(() =>
    checkCoverage(
      "js",
      cases.map((sample) => sample.id),
      coverage
    )
  );
});
test("empty, skipped, duplicate, repaired, or incorrect observations fail", () => {
  assert.throws(() => checkObservations("js", [], result("js")));
  for (const observations of [
    [],
    result("js").runs[0].observations.slice(1),
    [
      result("js").runs[0].observations[0],
      result("js").runs[0].observations[0],
    ],
    [
      { caseId: "positive", outcome: { value: 41 } },
      result("js").runs[0].observations[1],
    ],
    [
      result("js").runs[0].observations[0],
      { caseId: "negative", outcome: { value: true } },
    ],
    [
      result("js").runs[0].observations[0],
      { caseId: "negative", outcome: { error: "crash" } },
    ],
  ]) {
    const r = result("js");
    r.runs[0].observations = observations;
    assert.throws(() => checkObservations("js", cases, r));
  }
});
test("Lua requires both full independent runtime results", () => {
  assert.equal(
    checkObservations("lua", cases, result("lua")).length,
    requiredRuntimes("lua").length
  );
  const missing = result("lua");
  missing.runs.pop();
  assert.throws(() => checkObservations("lua", cases, missing));
  const duplicate = result("lua");
  duplicate.runs[1].runtime = duplicate.runs[0].runtime;
  assert.throws(() => checkObservations("lua", cases, duplicate));
  const skipped = result("lua");
  skipped.runs[1].observations = [];
  assert.throws(() => checkObservations("lua", cases, skipped));
});
test("the real wrapper never writes receipts for zero-exit skips, crashes, or artifact repairs", () => {
  const source = path.resolve(
    process.env.VEXILLA_CONTRACT_DIR || path.join(root, ".contract-artifacts")
  );
  const scratch = fs.mkdtempSync(
    path.join(os.tmpdir(), "vexilla-runner-test-")
  );
  const script = path.join(scratch, "native.cjs");
  fs.writeFileSync(
    script,
    `
    const fs = require("node:fs");
    const path = require("node:path");
    const { readVectors } = require(${JSON.stringify(
      path.join(__dirname, "vectors.cjs")
    )});
    const dir = process.env.VEXILLA_CONTRACT_DIR;
    const mode = process.env.CONTRACT_TEST_MODE;
    if (mode === "crash") { process.exit(2); }
    if (mode === "skip") { process.exit(0); }
    const observations = readVectors(dir).map((sample) => ({ caseId: sample.id, outcome: sample.expected }));
    if (mode === "wrong") { observations[0].outcome = { value: "wrong" }; }
    if (mode === "repair") {
      const metaPath = path.join(dir, "metadata.json");
      const meta = JSON.parse(fs.readFileSync(metaPath)); meta.revision = "repaired";
      fs.writeFileSync(metaPath, JSON.stringify(meta));
    }
    fs.writeFileSync(process.env.VEXILLA_OBSERVATIONS_FILE, JSON.stringify({ protocol: 1, sdk: "js", runs: [{ runtime: "native", observations }] }));
  `
  );
  try {
    for (const mode of ["skip", "crash", "wrong", "repair", "complete"]) {
      const dir = path.join(scratch, mode);
      fs.mkdirSync(dir);
      for (const file of fs
        .readdirSync(source)
        .filter((file) => file.endsWith(".json"))) {
        fs.copyFileSync(path.join(source, file), path.join(dir, file));
      }
      const receipt = path.join(dir, "receipts/js.json");
      fs.mkdirSync(path.dirname(receipt));
      fs.writeFileSync(receipt, "stale receipt must be removed");
      const run = spawnSync(
        process.execPath,
        [path.join(__dirname, "run.cjs"), "js"],
        {
          env: {
            ...process.env,
            VEXILLA_CONTRACT_DIR: dir,
            VEXILLA_RECEIPT_DIR: path.dirname(receipt),
            VEXILLA_CONTRACT_LAUNCHER: JSON.stringify([
              process.execPath,
              script,
            ]),
            CONTRACT_TEST_MODE: mode,
          },
          encoding: "utf8",
        }
      );
      assert.equal(run.error, undefined);
      assert.equal(
        run.status === 0,
        mode === "complete",
        run.stdout + run.stderr
      );
      assert.equal(fs.existsSync(receipt), mode === "complete");
      if (mode === "complete") {
        assert.equal(
          JSON.parse(fs.readFileSync(receipt)).coverage[0].caseIds.length,
          readVectors(source).length
        );
      }
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
