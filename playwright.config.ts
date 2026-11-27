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
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:3100",
          localStorage: [
            {
              name: "tuavitrine:analytics-consent",
              value: JSON.stringify({ version: 1, state: "accepted" }),
            },
          ],
        },
      ],
    },
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
      APP_URL: "http://localhost:3100",
      BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
      E2E_AUTH_BYPASS: "1",
      NEXT_PUBLIC_APP_ENV: "development",
      NEXT_PUBLIC_POSTHOG_HOST: "",
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "",
      POSTHOG_HOST: "",
      POSTHOG_PROJECT_TOKEN: "",
      R2_ACCESS_KEY_ID: "",
      R2_ACCOUNT_ID: "",
      R2_BUCKET_NAME: "",
      R2_PUBLIC_URL: "",
      R2_SECRET_ACCESS_KEY: "",
      STORAGE_DIR: "./work/test-storage",
    },
    timeout: 120000,
  },
});
