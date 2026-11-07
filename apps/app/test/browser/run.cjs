const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { record, prepareRunDirectory } = require("./support/record.cjs");

async function main() {
  const args = process.argv.slice(2);
  const collecting = !args.some((arg) =>
    ["--list", "--help", "-h"].includes(arg)
  );
  const directory = collecting
    ? prepareRunDirectory(
        path.resolve(__dirname, "../../test-results/diagnostics")
      )
    : undefined;
  if (directory) {
    process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR = directory;
  }
  const preload = path.join(__dirname, "support/preload.cjs");
  record("run.begin", { nodeVersion: process.versions.node });
  const child = spawn(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", ...args],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: collecting
          ? `${process.env.NODE_OPTIONS || ""} --require=${JSON.stringify(
              preload
            )}`
          : process.env.NODE_OPTIONS,
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
  if (!collecting) {
    process.exitCode = code;
    return;
  }
  // Raw traces can contain synthetic credentials in API arguments/network data.
  // Sanitize before the producer uploads anything, even when the suite failed.
  const { sanitizeTraces } = require("./support/sanitize-traces.cjs");
  const artifacts = path.resolve(__dirname, "../../test-results/artifacts");
  try {
    // Preserve Playwright's --last-failed bookkeeping locally, outside the
    // published directory. The sanitizer removes it before we copy traces.
    const lastRunFile = path.join(artifacts, ".last-run.json");
    const lastRun = fs.existsSync(lastRunFile)
      ? fs.readFileSync(lastRunFile)
      : undefined;
    await sanitizeTraces(artifacts);
    if (fs.existsSync(artifacts)) {
      fs.cpSync(artifacts, path.join(directory, "traces"), { recursive: true });
    }
    if (lastRun) {
      fs.writeFileSync(lastRunFile, lastRun);
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
