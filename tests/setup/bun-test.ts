import { mock } from "bun:test";

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

process.env.DATABASE_URL = databaseUrl;
process.env.APP_ENV = "test";
process.env.AUTH_MODE = "local";
process.env.LOCAL_ONLY = "true";
process.env.APP_URL = "http://localhost:3000";
process.env.STORAGE_DIR = "./work/test-storage";
process.env.BILLING_MODE = "disabled";
process.env.MAIL_TRANSPORT = "file";

mock.module("server-only", () => ({}));
