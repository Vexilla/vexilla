import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "test/browser",
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --force",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
