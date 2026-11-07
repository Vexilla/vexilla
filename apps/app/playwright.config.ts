import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "test/browser",
  outputDir: "test-results/artifacts",
  reporter: [["list"], ["./test/browser/support/diagnostic-reporter.cjs"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: {
      mode: "retain-on-failure",
      screenshots: false,
      snapshots: false,
      sources: false,
    },
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --force",
    url: "http://127.0.0.1:5173",
    stdout: "pipe",
    stderr: "pipe",
    reuseExistingServer: !process.env.CI,
  },
});
