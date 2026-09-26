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
  MAIL_TRANSPORT: z.enum(["file", "smtp", "resend", "disabled"]).default("file"),
  MAIL_OUTBOX_DIR: z.string().min(1).default("./work/mail-outbox"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().email().default("noreply@tuavitrine.local"),
  SUPPORT_EMAIL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().email().optional()
  ),
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  RESEND_EMAIL_DOMAIN: z.string().min(1).optional(),
  STORAGE_DRIVER: z.enum(["local", "vercel-blob", "disabled"]).default("local"),
  STORAGE_DIR: z.string().min(1).default("./work/storage"),
  BLOB_READ_WRITE_TOKEN: z.string().min(20).optional(),
  BILLING_MODE: z.enum(["disabled", "stripe"]).default("disabled"),
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^[sr]k_(test|live)_/)
    .optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_PRICE_BASIC_MONTHLY: z.string().startsWith("price_").optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().startsWith("price_").optional(),
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

  if (publicEnvironment && url.protocol !== "https:") {
    throw new Error("Staging/produção exigem HTTPS.");
  }

  if (env.MAIL_TRANSPORT === "smtp" && (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD)) {
    throw new Error("Configure SMTP_HOST, SMTP_USER e SMTP_PASSWORD.");
  }

  if (env.MAIL_TRANSPORT === "resend" && (!env.RESEND_API_KEY || !env.RESEND_EMAIL_DOMAIN)) {
    throw new Error("Configure RESEND_API_KEY e RESEND_EMAIL_DOMAIN.");
  }

  if (env.MAIL_TRANSPORT === "file" && env.LOCAL_ONLY !== "true") {
    throw new Error("A caixa de e-mails em arquivos funciona somente em localhost.");
  }

  if (env.STORAGE_DRIVER === "vercel-blob" && !env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN é obrigatório com STORAGE_DRIVER=vercel-blob.");
  }

  if (publicEnvironment && input.VERCEL === "1" && env.STORAGE_DRIVER === "local") {
    throw new Error("Na Vercel, use STORAGE_DRIVER=vercel-blob ou disabled.");
  }

  const stripeValues = [
    env.STRIPE_SECRET_KEY,
    env.STRIPE_WEBHOOK_SECRET,
    env.STRIPE_PRICE_BASIC_MONTHLY,
    env.STRIPE_PRICE_PRO_MONTHLY,
  ];

  if (env.BILLING_MODE === "stripe" && !stripeValues.every(Boolean)) {
    throw new Error("Configure todas as variáveis do Stripe para habilitar assinaturas.");
  }

  return env;
}

export function getEnv() {
  return parseEnv(process.env);
}
