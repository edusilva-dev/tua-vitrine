import { defineConfig, devices } from "@playwright/test";

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://tuavitrine:tuavitrine_local@localhost:55432/tuavitrine_test";

if (new URL(databaseUrl).pathname !== "/tuavitrine_test") {
  throw new Error("Os testes de interface exigem um banco exclusivo chamado tuavitrine_test.");
}

process.env.E2E_DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/setup/e2e-fixtures.ts",
  globalTeardown: "./tests/setup/e2e-teardown.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "bun run dev --port 3100",
    wait: { stdout: /Ready in/ },
    reuseExistingServer: false,
    env: {
      DATABASE_URL: databaseUrl,
      APP_ENV: "test",
      APP_URL: "http://localhost:3100",
      AUTH_MODE: "local",
      LOCAL_ONLY: "true",
      STORAGE_DIR: "./work/test-storage",
    },
    timeout: 120000,
  },
});
