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
process.env.APP_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET = "test-only-secret-with-more-than-32-characters";
process.env.STORAGE_DIR = "./work/test-storage";
delete process.env.R2_ACCOUNT_ID;
delete process.env.R2_ACCESS_KEY_ID;
delete process.env.R2_SECRET_ACCESS_KEY;
delete process.env.R2_BUCKET_NAME;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.STRIPE_PRICE_BASIC_MONTHLY;
delete process.env.STRIPE_PRICE_PRO_MONTHLY;

mock.module("server-only", () => ({}));
