import "server-only";
import { z } from "zod";

const LOCAL_APP_URL = "http://localhost:3000";

const optionalString = (schema: z.ZodString) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const schema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL é obrigatória." })
    .url()
    .refine((url) => /^postgres(ql)?:/.test(url), "Use PostgreSQL."),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).optional(),
  APP_URL: z
    .string()
    .url()
    .refine((url) => /^https?:/.test(url), "Use HTTP ou HTTPS."),
  BETTER_AUTH_SECRET: z
    .string({ error: "BETTER_AUTH_SECRET é obrigatório." })
    .min(32, "BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres."),
  MAIL_OUTBOX_DIR: z.string().min(1).default("./work/mail-outbox"),
  MAIL_FROM: z.string().email().default("noreply@tuavitrine.local"),
  SUPPORT_EMAIL: optionalString(z.string().email()),
  RESEND_API_KEY: optionalString(z.string().startsWith("re_")),
  STORAGE_DIR: z.string().min(1).default("./work/storage"),
  BLOB_READ_WRITE_TOKEN: optionalString(z.string().min(20)),
  STRIPE_SECRET_KEY: optionalString(z.string().regex(/^[sr]k_(test|live)_/)),
  STRIPE_WEBHOOK_SECRET: optionalString(z.string().startsWith("whsec_")),
  STRIPE_PRICE_BASIC_MONTHLY: optionalString(z.string().startsWith("price_")),
  STRIPE_PRICE_PRO_MONTHLY: optionalString(z.string().startsWith("price_")),
});

export function parseEnv(input: Record<string, string | undefined>) {
  const isVercel = input.VERCEL === "1";
  const isProduction = isVercel && input.VERCEL_ENV === "production";
  const vercelUrl = input.VERCEL_URL ? `https://${input.VERCEL_URL}` : undefined;
  const env = schema.parse({
    ...input,
    APP_URL: input.APP_URL || vercelUrl || LOCAL_APP_URL,
  });
  const appUrl = new URL(env.APP_URL);
  const authBypass = input.E2E_AUTH_BYPASS === "1";

  if (appUrl.username || appUrl.password || appUrl.pathname !== "/" || appUrl.search || appUrl.hash)
    throw new Error("APP_URL deve conter somente a origem da aplicação.");

  if (isProduction) {
    const missing = [
      ["APP_URL", input.APP_URL],
      ["BLOB_READ_WRITE_TOKEN", env.BLOB_READ_WRITE_TOKEN],
      ["MAIL_FROM", input.MAIL_FROM],
      ["RESEND_API_KEY", env.RESEND_API_KEY],
      ["STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY],
      ["STRIPE_WEBHOOK_SECRET", env.STRIPE_WEBHOOK_SECRET],
      ["STRIPE_PRICE_BASIC_MONTHLY", env.STRIPE_PRICE_BASIC_MONTHLY],
      ["STRIPE_PRICE_PRO_MONTHLY", env.STRIPE_PRICE_PRO_MONTHLY],
    ].flatMap(([name, value]) => (value ? [] : [name]));

    if (missing.length > 0)
      throw new Error(`Variáveis obrigatórias ausentes em produção: ${missing.join(", ")}.`);
  }

  if (isVercel && appUrl.protocol !== "https:") throw new Error("Deploys na Vercel exigem HTTPS.");

  if (authBypass) {
    const database = new URL(env.DATABASE_URL);
    const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname);

    if (isVercel || !localHost || database.pathname !== "/tuavitrine_test")
      throw new Error("E2E_AUTH_BYPASS funciona somente no banco isolado de testes local.");
  }

  const stripeValues = [
    env.STRIPE_SECRET_KEY,
    env.STRIPE_WEBHOOK_SECRET,
    env.STRIPE_PRICE_BASIC_MONTHLY,
    env.STRIPE_PRICE_PRO_MONTHLY,
  ];
  const configuredStripeValues = stripeValues.filter(Boolean).length;

  if (configuredStripeValues > 0 && configuredStripeValues < stripeValues.length)
    throw new Error("Configure todas as quatro variáveis do Stripe juntas.");

  return {
    ...env,
    DATABASE_POOL_MAX: env.DATABASE_POOL_MAX ?? (isVercel ? 1 : 10),
    AUTH_ENABLED: !authBypass,
    MAIL_TRANSPORT: env.RESEND_API_KEY ? ("resend" as const) : ("file" as const),
    STORAGE_DRIVER: env.BLOB_READ_WRITE_TOKEN ? ("vercel-blob" as const) : ("local" as const),
    BILLING_ENABLED: configuredStripeValues === stripeValues.length,
  };
}

export function getEnv() {
  return parseEnv(process.env);
}
