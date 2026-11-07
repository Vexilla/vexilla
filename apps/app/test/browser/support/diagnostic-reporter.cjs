const path = require("node:path");
const { record } = require("./record.cjs");

function testFields(test, result) {
  return {
    testId: test.id,
    file: path.basename(test.location.file),
    line: test.location.line,
    workerIndex: result.workerIndex,
    retry: result.retry,
    repeatEachIndex: test.repeatEachIndex,
  };
}

// Vite can print arbitrary exception text. Persist event classes only; never
// persist raw output, evaluate arguments, assertion values, or test titles.
function viteOutput(chunk, stream) {
  const text = chunk.toString().replace(/\x1b\[[0-9;]*m/g, "");
  if (!text.includes("[WebServer]")) {
    return;
  }
  const events = [
    ["forced-optimization", /Forced re-optimization of dependencies/],
    ["ready", /VITE v[\d.]+\s+ready/],
    ["dependencies-optimized", /new dependencies optimized/],
    ["dependencies-reload", /optimized dependencies changed.*reloading/],
    ["page-reload", /page reload/],
    ["hmr-update", /hmr update/],
    ["error", /Internal server error|Pre-transform error/],
  ];
  const matches = events.filter(([, expression]) => expression.test(text));
  record("vite.output", {
    stream,
    kinds: matches.length ? matches.map(([kind]) => kind) : ["other-redacted"],
    bytes: Buffer.byteLength(chunk),
  });
}

class DiagnosticReporter {
  onTestBegin(test, result) {
    record("test.begin", testFields(test, result));
  }
  onTestEnd(test, result) {
    record("test.end", {
      ...testFields(test, result),
      status: result.status,
      durationMs: result.duration,
    });
  }
  onStepBegin(test, result, step) {
    if (
      step.category === "hook" ||
      /^(page|jsHandle)\.evaluate/.test(step.title)
    ) {
      record("step.begin", {
        ...testFields(test, result),
        kind: step.category === "hook" ? "hook" : "evaluate",
        teardown:
          step.title === "After Hooks" || step.title === "Worker Cleanup",
      });
    }
  }
  onStepEnd(test, result, step) {
    if (step.error) {
      record("step.error", {
        ...testFields(test, result),
        category: ["hook", "pw:api", "expect", "test.step"].includes(
          step.category
        )
          ? step.category
          : "other",
      });
    }
  }
  onStdOut(chunk) {
    viteOutput(chunk, "stdout");
  }
  onStdErr(chunk) {
    viteOutput(chunk, "stderr");
  }
}

module.exports = DiagnosticReporter;
module.exports.viteOutput = viteOutput;
