import "server-only";
import { z } from "zod";

const LOCAL_DATABASE_URL = "postgresql://tuavitrine:tuavitrine_local@localhost:55432/tuavitrine";
const LOCAL_APP_URL = "http://localhost:3000";

const optionalString = (schema: z.ZodString) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const schema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => /^postgres(ql)?:/.test(url), "Use PostgreSQL.")
    .default(LOCAL_DATABASE_URL),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).optional(),
  APP_URL: z
    .string()
    .url()
    .refine((url) => /^https?:/.test(url), "Use HTTP ou HTTPS."),
  BETTER_AUTH_SECRET: optionalString(z.string().min(32)),
  MAIL_OUTBOX_DIR: z.string().min(1).default("./work/mail-outbox"),
  SMTP_HOST: optionalString(z.string().min(1)),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: optionalString(z.string().min(1)),
  SMTP_PASSWORD: optionalString(z.string().min(1)),
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
  const vercelUrl = input.VERCEL_URL ? `https://${input.VERCEL_URL}` : undefined;
  const env = schema.parse({
    ...input,
    APP_URL: input.APP_URL || vercelUrl || LOCAL_APP_URL,
  });
  const appUrl = new URL(env.APP_URL);
  const authEnabled = Boolean(env.BETTER_AUTH_SECRET);

  if (appUrl.username || appUrl.password || appUrl.pathname !== "/" || appUrl.search || appUrl.hash)
    throw new Error("APP_URL deve conter somente a origem da aplicação.");

  if (!authEnabled && !["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname))
    throw new Error("BETTER_AUTH_SECRET é obrigatório fora do ambiente local.");

  if (isVercel && !input.DATABASE_URL) throw new Error("DATABASE_URL é obrigatória na Vercel.");

  if (isVercel && !authEnabled) throw new Error("BETTER_AUTH_SECRET é obrigatório na Vercel.");

  if (isVercel && appUrl.protocol !== "https:") throw new Error("Deploys na Vercel exigem HTTPS.");

  const smtpValues = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASSWORD];
  const configuredSmtpValues = smtpValues.filter(Boolean).length;

  if (configuredSmtpValues > 0 && configuredSmtpValues < smtpValues.length)
    throw new Error("Configure SMTP_HOST, SMTP_USER e SMTP_PASSWORD juntos.");

  const mailTransport = env.RESEND_API_KEY
    ? ("resend" as const)
    : configuredSmtpValues === smtpValues.length
      ? ("smtp" as const)
      : isVercel
        ? ("disabled" as const)
        : ("file" as const);

  if ((mailTransport === "resend" || mailTransport === "smtp") && !input.MAIL_FROM)
    throw new Error("MAIL_FROM é obrigatório quando o envio de e-mail está configurado.");

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
    AUTH_ENABLED: authEnabled,
    MAIL_TRANSPORT: mailTransport,
    STORAGE_DRIVER: env.BLOB_READ_WRITE_TOKEN
      ? ("vercel-blob" as const)
      : isVercel
        ? ("disabled" as const)
        : ("local" as const),
    BILLING_ENABLED: configuredStripeValues === stripeValues.length,
  };
}

export function getEnv() {
  return parseEnv(process.env);
}
