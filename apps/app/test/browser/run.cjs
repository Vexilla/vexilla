const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { record } = require("./support/record.cjs");

async function main() {
  const directory = path.resolve(__dirname, "../../test-results/diagnostics");
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR = directory;
  const preload = path.join(__dirname, "support/preload.cjs");
  record("run.begin", { nodeVersion: process.versions.node });
  const child = spawn(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: `${
          process.env.NODE_OPTIONS || ""
        } --require=${JSON.stringify(preload)}`,
      },
    }
  );
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      record("run.signal", { signal });
      child.kill(signal);
    });
  }
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  // Raw traces can contain synthetic credentials in API arguments/network data.
  // Sanitize before the producer uploads anything, even when the suite failed.
  const { sanitizeTraces } = require("./support/sanitize-traces.cjs");
  const artifacts = path.resolve(__dirname, "../../test-results/artifacts");
  try {
    await sanitizeTraces(artifacts);
    if (fs.existsSync(artifacts)) {
      fs.cpSync(artifacts, path.join(directory, "traces"), { recursive: true });
    }
  } catch {
    record("trace.sanitization-failed");
    process.exitCode = 1;
    return;
  }
  record("run.end", { code });
  process.exitCode = code;
}

main().catch(() => {
  record("run.error");
  process.exitCode = 1;
});
