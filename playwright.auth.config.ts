import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://tuavitrine:tuavitrine_local@localhost:55432/tuavitrine_test";

if (new URL(databaseUrl).pathname !== "/tuavitrine_test") {
  throw new Error("Os testes de autenticação exigem o banco exclusivo tuavitrine_test.");
}

process.env.E2E_DATABASE_URL = databaseUrl;

const authOutbox = resolve("work/auth-test-outbox");
const authStorage = resolve("work/auth-test-storage");

export default defineConfig({
  testDir: "./tests/auth-e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  expect: { timeout: 15000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3200",
    navigationTimeout: 60000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "auth-chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "bun run build && mkdir -p .next/standalone/.next && " +
      "cp -R .next/static .next/standalone/.next/static && bun .next/standalone/server.js",
    wait: { stdout: /Ready in/ },
    reuseExistingServer: false,
    timeout: 240000,
    env: {
      DATABASE_URL: databaseUrl,
      APP_ENV: "test",
      APP_URL: "http://localhost:3200",
      AUTH_MODE: "session",
      LOCAL_ONLY: "true",
      BETTER_AUTH_SECRET: "test-only-auth-secret-7c35f6d4b8298ce2a1f0928713fce017",
      MAIL_TRANSPORT: "file",
      MAIL_OUTBOX_DIR: authOutbox,
      STORAGE_DIR: authStorage,
      HOSTNAME: "127.0.0.1",
      PORT: "3200",
    },
  },
});
