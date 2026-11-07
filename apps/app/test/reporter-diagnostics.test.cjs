const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const Reporter = require("./browser/support/diagnostic-reporter.cjs");

test("reporter correlates teardown and Vite reloads without persisting output or values", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-reporter-"));
  const previous = process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR;
  process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR = directory;
  try {
    const reporter = new Reporter();
    const info = {
      id: "abcd",
      location: { file: "/test/example.spec.ts", line: 1 },
      repeatEachIndex: 0,
    };
    const result = {
      workerIndex: 2,
      retry: 0,
      status: "failed",
      duration: 123,
    };
    reporter.onTestBegin(info, result);
    reporter.onStepBegin(info, result, {
      category: "hook",
      title: "After Hooks",
    });
    reporter.onStepEnd(info, result, {
      category: "pw:api",
      error: { message: "secret-poison" },
      title: "secret-poison",
    });
    reporter.onStdOut(
      Buffer.from(
        "[WebServer] optimized dependencies changed. reloading secret-poison"
      )
    );
    reporter.onStdErr(
      Buffer.from("[WebServer] Internal server error: secret-poison")
    );
    reporter.onTestEnd(info, result);
    const text = fs.readFileSync(
      path.join(directory, `events-${process.pid}.jsonl`),
      "utf8"
    );
    assert.ok(!text.includes("secret-poison"));
    const events = text.trim().split("\n").map(JSON.parse);
    assert.equal(events.find((e) => e.event === "step.begin").teardown, true);
    assert.deepEqual(
      events.filter((e) => e.event === "vite.output").map((e) => e.kinds),
      [["dependencies-reload"], ["error"]]
    );
    assert.equal(events.at(-1).status, "failed");
    assert.ok(events.every((e) => e.time && Number.isFinite(e.monotonicMs)));
  } finally {
    if (previous === undefined)
      delete process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR;
    else process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
