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

    expect(() => parseEnv(production)).toThrow(/STORAGE_DRIVER=disabled/);
    expect(parseEnv({ ...production, STORAGE_DRIVER: "disabled" }).STORAGE_DRIVER).toBe("disabled");
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
});
