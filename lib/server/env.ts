import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => /^postgres(ql)?:/.test(url), "Use PostgreSQL."),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(10),
  APP_URL: z
    .string()
    .url()
    .refine((url) => /^https?:/.test(url), "Use HTTP ou HTTPS."),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  LOCAL_ONLY: z.enum(["true", "false"]).default("true"),
  AUTH_MODE: z.enum(["local", "session"]).default("local"),
  BETTER_AUTH_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional()
  ),
  MAIL_TRANSPORT: z.enum(["file", "smtp"]).default("file"),
  MAIL_OUTBOX_DIR: z.string().min(1).default("./work/mail-outbox"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().email().default("noreply@tuavitrine.local"),
  STORAGE_DRIVER: z.enum(["local", "disabled"]).default("local"),
  STORAGE_DIR: z.string().min(1).default("./work/storage"),
});

export function parseEnv(input: Record<string, string | undefined>) {
  const vercelUrl = input.VERCEL_URL ? `https://${input.VERCEL_URL}` : undefined;
  const env = schema.parse({ ...input, APP_URL: input.APP_URL || vercelUrl });
  const publicEnvironment = env.APP_ENV === "staging" || env.APP_ENV === "production";

  if (env.AUTH_MODE === "session" && !env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET é obrigatório no modo autenticado (mínimo 32 caracteres).");
  }

  if (env.AUTH_MODE === "local" && (publicEnvironment || env.LOCAL_ONLY !== "true")) {
    throw new Error("O painel sem autenticação funciona somente em ambiente local.");
  }

  const url = new URL(env.APP_URL);

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("APP_URL deve conter somente a origem da aplicação.");
  }

  if (env.LOCAL_ONLY === "true" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("APP_URL deve apontar para localhost no modo LOCAL_ONLY.");
  }

  if (publicEnvironment && (url.protocol !== "https:" || env.MAIL_TRANSPORT !== "smtp")) {
    throw new Error("Staging/produção exigem HTTPS e envio SMTP.");
  }

  if (env.MAIL_TRANSPORT === "smtp" && (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD)) {
    throw new Error("Configure SMTP_HOST, SMTP_USER e SMTP_PASSWORD.");
  }

  if (env.MAIL_TRANSPORT === "file" && env.LOCAL_ONLY !== "true") {
    throw new Error("A caixa de e-mails em arquivos funciona somente em localhost.");
  }

  if (publicEnvironment && input.VERCEL === "1" && env.STORAGE_DRIVER === "local") {
    throw new Error("Na Vercel, configure STORAGE_DRIVER=disabled até adotar storage persistente.");
  }

  return env;
}

export function getEnv() {
  return parseEnv(process.env);
}
