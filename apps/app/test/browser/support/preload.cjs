const { record } = require("./record.cjs");
const { install } = require("./protocol-diagnostics.cjs");

// Runs in the CLI and its workers, before Playwright loads Chromium's transport.
if (process.env.VEXILLA_BROWSER_DIAGNOSTICS_DIR) {
  record("diagnostics.installed", install(record));
  process.once("exit", (code) => record("process.exit", { code }));
}
