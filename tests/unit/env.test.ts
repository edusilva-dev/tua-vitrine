import { describe, expect, test } from "bun:test";
import { parseEnv } from "@/lib/server/env";

const local = {
  DATABASE_URL: "postgresql://local:local@localhost:55432/tuavitrine_test",
  APP_URL: "http://localhost:3000",
  APP_ENV: "test",
  LOCAL_ONLY: "true",
};

describe("limites dos ambientes", () => {
  test("modo sem login nunca inicia publicamente", () => {
    expect(() => parseEnv({ ...local, APP_ENV: "production" })).toThrow();
    expect(() => parseEnv({ ...local, LOCAL_ONLY: "false" })).toThrow();
    expect(() => parseEnv({ ...local, APP_URL: "https://public.example" })).toThrow();
  });

  test("modo autenticado exige segredo e origem canônica", () => {
    expect(() => parseEnv({ ...local, AUTH_MODE: "session" })).toThrow();
    expect(() => parseEnv({ ...local, APP_URL: "http://localhost:3000/path" })).toThrow();
  });

  test("ambiente público exige sessão, HTTPS e e-mail real", () => {
    const production = {
      ...local,
      APP_ENV: "production",
      AUTH_MODE: "session",
      LOCAL_ONLY: "false",
      APP_URL: "https://vitrine.example",
      BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
      MAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example",
      SMTP_USER: "test",
      SMTP_PASSWORD: "test-password",
      MAIL_FROM: "conta@vitrine.example",
    };

    expect(parseEnv(production).AUTH_MODE).toBe("session");
    expect(() => parseEnv({ ...production, MAIL_TRANSPORT: "file" })).toThrow();
    expect(parseEnv({ ...production, MAIL_TRANSPORT: "disabled" }).MAIL_TRANSPORT).toBe("disabled");
    expect(() => parseEnv({ ...production, MAIL_TRANSPORT: "resend" })).toThrow(/RESEND/);
    expect(
      parseEnv({
        ...production,
        MAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "re_test_only",
        RESEND_EMAIL_DOMAIN: "vitrine.example",
      }).MAIL_TRANSPORT
    ).toBe("resend");
    expect(() => parseEnv({ ...production, APP_URL: "http://vitrine.example" })).toThrow();
    expect(() => parseEnv({ ...production, SMTP_PASSWORD: undefined })).toThrow();
  });

  test("filesystem local é recusado na Vercel pública", () => {
    const production = {
      ...local,
      VERCEL: "1",
      APP_ENV: "production",
      AUTH_MODE: "session",
      LOCAL_ONLY: "false",
      APP_URL: "https://vitrine.example",
      BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
      MAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example",
      SMTP_USER: "test",
      SMTP_PASSWORD: "test-password",
      MAIL_FROM: "conta@vitrine.example",
    };

    expect(() => parseEnv(production)).toThrow(/vercel-blob ou disabled/);
    expect(parseEnv({ ...production, STORAGE_DRIVER: "disabled" }).STORAGE_DRIVER).toBe("disabled");
    expect(() => parseEnv({ ...production, STORAGE_DRIVER: "vercel-blob" })).toThrow(
      /BLOB_READ_WRITE_TOKEN/
    );
    expect(
      parseEnv({
        ...production,
        STORAGE_DRIVER: "vercel-blob",
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test_token",
      }).STORAGE_DRIVER
    ).toBe("vercel-blob");
  });

  test("preview da Vercel deriva a origem do próprio deployment", () => {
    const preview = parseEnv({
      ...local,
      APP_URL: undefined,
      APP_ENV: "staging",
      LOCAL_ONLY: "false",
      AUTH_MODE: "session",
      BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
      MAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example",
      SMTP_USER: "test",
      SMTP_PASSWORD: "test-password",
      MAIL_FROM: "conta@vitrine.example",
      STORAGE_DRIVER: "disabled",
      VERCEL: "1",
      VERCEL_URL: "preview-tua-vitrine.vercel.app",
    });

    expect(preview.APP_URL).toBe("https://preview-tua-vitrine.vercel.app");
  });

  test("Stripe só é habilitado com o contrato completo", () => {
    expect(parseEnv({ ...local, STRIPE_SECRET_KEY: "rk_test_example" }).BILLING_MODE).toBe(
      "disabled"
    );
    expect(() =>
      parseEnv({ ...local, BILLING_MODE: "stripe", STRIPE_SECRET_KEY: "rk_test_example" })
    ).toThrow(/todas as variáveis do Stripe/);

    const env = parseEnv({
      ...local,
      BILLING_MODE: "stripe",
      STRIPE_SECRET_KEY: "rk_test_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      STRIPE_PRICE_BASIC_MONTHLY: "price_basic",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro",
    });

    expect(env.STRIPE_PRICE_BASIC_MONTHLY).toBe("price_basic");
    expect(env.STRIPE_PRICE_PRO_MONTHLY).toBe("price_pro");
    expect(env.BILLING_MODE).toBe("stripe");
  });
});
