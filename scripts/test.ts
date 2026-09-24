import { spawn } from "bun";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://tuavitrine:tuavitrine_local@localhost:55432/tuavitrine_test";
const url = new URL(databaseUrl);

if (
  url.pathname !== "/tuavitrine_test" ||
  !["localhost", "127.0.0.1", "db"].includes(url.hostname)
) {
  throw new Error("TEST_DATABASE_URL deve apontar para o banco local exclusivo tuavitrine_test.");
}

const result = spawn(
  [process.execPath, "test", "--conditions=react-server", "tests/unit", "tests/integration"],
  {
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      APP_ENV: "test",
      AUTH_MODE: "local",
      LOCAL_ONLY: "true",
      APP_URL: "http://localhost:3000",
      STORAGE_DIR: "./work/test-storage",
      BILLING_MODE: "disabled",
      MAIL_TRANSPORT: "file",
    },
  }
);

process.exitCode = await result.exited;
