const fs = require("node:fs");
const path = require("node:path");

function prepareRunDirectory(root, preserve = Boolean(process.env.CI)) {
  if (!preserve) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, "run-"));
}

// Only callers that project onto known diagnostic fields may use this sink.
function record(event, data = {}) {
  const directory = process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR;
  if (!directory) {
    return;
  }
  fs.mkdirSync(directory, { recursive: true });
  fs.appendFileSync(
    path.join(directory, `events-${process.pid}.jsonl`),
    JSON.stringify({
      time: new Date().toISOString(),
      monotonicMs: Number(process.hrtime.bigint() / 1000000n),
      pid: process.pid,
      workerIndex: /^\d+$/.test(process.env.TEST_WORKER_INDEX || "")
        ? Number(process.env.TEST_WORKER_INDEX)
        : undefined,
      parallelIndex: /^\d+$/.test(process.env.TEST_PARALLEL_INDEX || "")
        ? Number(process.env.TEST_PARALLEL_INDEX)
        : undefined,
      event,
      ...data,
    }) + "\n"
  );
}

module.exports = { record, prepareRunDirectory };
