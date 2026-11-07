const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { record, prepareRunDirectory } = require("./browser/support/record.cjs");

test("CI preserves earlier invocation evidence, including recovered protocol errors", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-runs-"));
  const previous = process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR;
  try {
    const first = prepareRunDirectory(root, true);
    process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR = first;
    record("Runtime.callFunctionOn.error", { reason: "promise-collected" });
    const second = prepareRunDirectory(root, true);
    process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR = second;
    record("run.end", { code: 0 });
    assert.notEqual(first, second);
    const earlier = JSON.parse(
      fs.readFileSync(path.join(first, `events-${process.pid}.jsonl`), "utf8")
    );
    assert.equal(earlier.reason, "promise-collected");
    const current = JSON.parse(
      fs.readFileSync(path.join(second, `events-${process.pid}.jsonl`), "utf8")
    );
    assert.equal(current.code, 0);
    const local = prepareRunDirectory(root, false);
    assert.deepEqual(fs.readdirSync(root), [path.basename(local)]);
  } finally {
    if (previous === undefined) {
      delete process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR;
    } else {
      process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR = previous;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
