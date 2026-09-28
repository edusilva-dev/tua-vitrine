import { describe, expect, test } from "bun:test";
import { parseEnv } from "@/lib/server/env";

const local = {
  DATABASE_URL: "postgresql://local:local@localhost:55432/tuavitrine_test",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
};

const production = {
  ...local,
  VERCEL: "1",
  VERCEL_ENV: "production",
  APP_URL: "https://vitrine.example",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test_token",
  MAIL_FROM: "conta@vitrine.example",
  RESEND_API_KEY: "re_test_only",
  STRIPE_SECRET_KEY: "rk_test_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  STRIPE_PRICE_BASIC_MONTHLY: "price_basic",
  STRIPE_PRICE_PRO_MONTHLY: "price_pro",
};

describe("configuração dos ambientes", () => {
  test("banco e segredo de autenticação são sempre obrigatórios", () => {
    expect(() => parseEnv({ ...local, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...local, BETTER_AUTH_SECRET: undefined })).toThrow(
      /BETTER_AUTH_SECRET/
    );
    expect(parseEnv(local).AUTH_ENABLED).toBe(true);
  });

  test("desenvolvimento usa defaults apenas para serviços locais", () => {
    const env = parseEnv(local);

    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.MAIL_TRANSPORT).toBe("file");
    expect(env.STORAGE_DRIVER).toBe("local");
    expect(env.BILLING_ENABLED).toBe(false);
  });

  test("produção exige URL, Blob, Resend e Stripe completos", () => {
    expect(parseEnv(production)).toMatchObject({
      AUTH_ENABLED: true,
      MAIL_TRANSPORT: "resend",
      STORAGE_DRIVER: "vercel-blob",
      BILLING_ENABLED: true,
      DATABASE_POOL_MAX: 1,
    });

    for (const name of [
      "APP_URL",
      "BLOB_READ_WRITE_TOKEN",
      "MAIL_FROM",
      "RESEND_API_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_BASIC_MONTHLY",
      "STRIPE_PRICE_PRO_MONTHLY",
    ]) {
      expect(() => parseEnv({ ...production, [name]: undefined })).toThrow(/obrigatórias ausentes/);
    }
  });

  test("preview deriva a origem do deployment sem exigir integrações de produção", () => {
    const preview = parseEnv({
      ...local,
      APP_URL: undefined,
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: "preview-tua-vitrine.vercel.app",
    });

    expect(preview.APP_URL).toBe("https://preview-tua-vitrine.vercel.app");
  });

  test("configuração parcial do Stripe é recusada em qualquer ambiente", () => {
    expect(() => parseEnv({ ...local, STRIPE_SECRET_KEY: "rk_test_example" })).toThrow(
      /quatro variáveis do Stripe/
    );
  });

  test("bypass dos testes não pode sair do banco local isolado", () => {
    expect(parseEnv({ ...local, E2E_AUTH_BYPASS: "1" }).AUTH_ENABLED).toBe(false);
    expect(() =>
      parseEnv({
        ...local,
        DATABASE_URL: "postgresql://example:example@db.example/production",
        E2E_AUTH_BYPASS: "1",
      })
    ).toThrow(/banco isolado/);
  });
});
