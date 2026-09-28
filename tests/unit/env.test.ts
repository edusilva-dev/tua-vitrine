import { describe, expect, test } from "bun:test";
import { parseEnv } from "@/lib/server/env";

const local = {
  DATABASE_URL: "postgresql://local:local@localhost:55432/tuavitrine_test",
  APP_URL: "http://localhost:3000",
};

describe("configuração dos ambientes", () => {
  test("desenvolvimento local funciona sem variáveis opcionais", () => {
    const env = parseEnv({});

    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toContain("localhost:55432/tuavitrine");
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.AUTH_ENABLED).toBe(false);
    expect(env.MAIL_TRANSPORT).toBe("file");
    expect(env.STORAGE_DRIVER).toBe("local");
    expect(env.BILLING_ENABLED).toBe(false);
  });

  test("painel sem autenticação permanece restrito a localhost", () => {
    expect(() => parseEnv({ ...local, APP_URL: "https://public.example" })).toThrow(
      /BETTER_AUTH_SECRET/
    );
    expect(() => parseEnv({ ...local, APP_URL: "http://localhost:3000/path" })).toThrow();
  });

  test("Vercel exige banco, HTTPS e autenticação", () => {
    const production = {
      ...local,
      VERCEL: "1",
      APP_URL: "https://vitrine.example",
      BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
    };

    expect(() => parseEnv({ ...production, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...production, BETTER_AUTH_SECRET: undefined })).toThrow(
      /BETTER_AUTH_SECRET/
    );
    expect(() => parseEnv({ ...production, APP_URL: "http://vitrine.example" })).toThrow(/HTTPS/);
    expect(parseEnv(production).DATABASE_POOL_MAX).toBe(1);
  });

  test("preview da Vercel deriva a origem do deployment", () => {
    const preview = parseEnv({
      ...local,
      APP_URL: undefined,
      VERCEL: "1",
      VERCEL_URL: "preview-tua-vitrine.vercel.app",
      BETTER_AUTH_SECRET: "test-only-secret-with-more-than-32-characters",
    });

    expect(preview.APP_URL).toBe("https://preview-tua-vitrine.vercel.app");
  });

  test("e-mail é inferido pelas credenciais disponíveis", () => {
    expect(parseEnv(local).MAIL_TRANSPORT).toBe("file");
    expect(
      parseEnv({
        ...local,
        MAIL_FROM: "conta@vitrine.example",
        RESEND_API_KEY: "re_test_only",
      }).MAIL_TRANSPORT
    ).toBe("resend");
    expect(
      parseEnv({
        ...local,
        MAIL_FROM: "conta@vitrine.example",
        SMTP_HOST: "smtp.example",
        SMTP_USER: "test",
        SMTP_PASSWORD: "test-password",
      }).MAIL_TRANSPORT
    ).toBe("smtp");
    expect(() => parseEnv({ ...local, SMTP_HOST: "smtp.example" })).toThrow(/juntos/);
  });

  test("storage e Stripe são inferidos pelos contratos completos", () => {
    expect(parseEnv(local).STORAGE_DRIVER).toBe("local");
    expect(
      parseEnv({ ...local, BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test_token" }).STORAGE_DRIVER
    ).toBe("vercel-blob");
    expect(() => parseEnv({ ...local, STRIPE_SECRET_KEY: "rk_test_example" })).toThrow(
      /quatro variáveis do Stripe/
    );

    const env = parseEnv({
      ...local,
      STRIPE_SECRET_KEY: "rk_test_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      STRIPE_PRICE_BASIC_MONTHLY: "price_basic",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro",
    });

    expect(env.BILLING_ENABLED).toBe(true);
  });
});
