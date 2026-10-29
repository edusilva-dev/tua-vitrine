import "server-only";
import { z } from "zod";

const LOCAL_APP_URL = "http://localhost:3000";

const optionalString = <Schema extends z.ZodType<string>>(schema: Schema) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

function parsePostHogHost(value: string, variableName: string) {
  const host = new URL(value);

  if (
    host.protocol !== "https:" ||
    host.username ||
    host.password ||
    host.pathname !== "/" ||
    host.search ||
    host.hash
  )
    throw new Error(`${variableName} deve conter somente uma origem HTTPS.`);

  return host.origin;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
  R2_ACCOUNT_ID: optionalString(z.string().regex(/^[a-f0-9]{32}$/)),
  R2_ACCESS_KEY_ID: optionalString(z.string().min(16)),
  R2_SECRET_ACCESS_KEY: optionalString(z.string().min(32)),
  R2_BUCKET_NAME: optionalString(z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/)),
  R2_PUBLIC_URL: optionalString(z.string().url().startsWith("https://")),
  STRIPE_SECRET_KEY: optionalString(z.string().regex(/^[sr]k_(test|live)_/)),
  STRIPE_WEBHOOK_SECRET: optionalString(z.string().startsWith("whsec_")),
  STRIPE_PRICE_BASIC_MONTHLY: optionalString(z.string().startsWith("price_")),
  STRIPE_PRICE_PRO_MONTHLY: optionalString(z.string().startsWith("price_")),
  NEXT_PUBLIC_APP_ENV: optionalString(z.enum(["development", "staging", "production"])),
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: optionalString(z.string().min(10).regex(/^\S+$/)),
  NEXT_PUBLIC_POSTHOG_HOST: optionalString(z.string().url()),
  POSTHOG_PROJECT_TOKEN: optionalString(z.string().min(10).regex(/^\S+$/)),
  POSTHOG_HOST: optionalString(z.string().url()),
  APP_RELEASE: optionalString(z.string().min(1).max(200)),
  NEXT_PUBLIC_POSTHOG_DISABLED: z.enum(["0", "1"]).optional(),
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
      ["R2_ACCOUNT_ID", env.R2_ACCOUNT_ID],
      ["R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID],
      ["R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY],
      ["R2_BUCKET_NAME", env.R2_BUCKET_NAME],
      ["R2_PUBLIC_URL", env.R2_PUBLIC_URL],
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
  const r2Values = [
    env.R2_ACCOUNT_ID,
    env.R2_ACCESS_KEY_ID,
    env.R2_SECRET_ACCESS_KEY,
    env.R2_BUCKET_NAME,
    env.R2_PUBLIC_URL,
  ];
  const configuredR2Values = r2Values.filter(Boolean).length;
  const browserPostHogValues = [
    env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    env.NEXT_PUBLIC_POSTHOG_HOST,
    env.NEXT_PUBLIC_APP_ENV,
  ];
  const configuredBrowserPostHogValues = browserPostHogValues.filter(Boolean).length;
  const serverPostHogValues = [
    env.POSTHOG_PROJECT_TOKEN,
    env.POSTHOG_HOST,
    env.NEXT_PUBLIC_APP_ENV,
    env.APP_RELEASE,
  ];
  const configuredServerPostHogValues = serverPostHogValues.filter(Boolean).length;
  const browserPostHogConfigured = Boolean(
    env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || env.NEXT_PUBLIC_POSTHOG_HOST
  );
  const serverPostHogConfigured = Boolean(env.POSTHOG_PROJECT_TOKEN || env.POSTHOG_HOST);

  if (configuredStripeValues > 0 && configuredStripeValues < stripeValues.length)
    throw new Error("Configure todas as quatro variáveis do Stripe juntas.");

  if (env.R2_PUBLIC_URL) {
    const publicUrl = new URL(env.R2_PUBLIC_URL);

    if (
      publicUrl.username ||
      publicUrl.password ||
      publicUrl.pathname !== "/" ||
      publicUrl.search ||
      publicUrl.hash
    )
      throw new Error("R2_PUBLIC_URL deve conter somente uma origem HTTPS.");
  }

  if (configuredR2Values > 0 && configuredR2Values < r2Values.length)
    throw new Error("Configure todas as cinco variáveis do R2 juntas.");

  if (browserPostHogConfigured && configuredBrowserPostHogValues < browserPostHogValues.length)
    throw new Error("Configure token, host e ambiente do PostHog do browser juntos.");

  if (serverPostHogConfigured && configuredServerPostHogValues < serverPostHogValues.length)
    throw new Error("Configure token, host, ambiente e release do PostHog do servidor juntos.");

  const browserPostHogHost = env.NEXT_PUBLIC_POSTHOG_HOST
    ? parsePostHogHost(env.NEXT_PUBLIC_POSTHOG_HOST, "NEXT_PUBLIC_POSTHOG_HOST")
    : undefined;
  const serverPostHogHost = env.POSTHOG_HOST
    ? parsePostHogHost(env.POSTHOG_HOST, "POSTHOG_HOST")
    : undefined;

  if (
    env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    env.POSTHOG_PROJECT_TOKEN &&
    env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN !== env.POSTHOG_PROJECT_TOKEN
  )
    throw new Error("Browser e servidor devem usar o mesmo projeto PostHog.");

  if (browserPostHogHost && serverPostHogHost && browserPostHogHost !== serverPostHogHost)
    throw new Error("Browser e servidor devem usar o mesmo host PostHog.");

  return {
    ...env,
    DATABASE_POOL_MAX: env.DATABASE_POOL_MAX ?? (isVercel ? 1 : 10),
    AUTH_ENABLED: !authBypass,
    MAIL_TRANSPORT: env.RESEND_API_KEY ? ("resend" as const) : ("file" as const),
    STORAGE_DRIVER: configuredR2Values === r2Values.length ? ("r2" as const) : ("local" as const),
    R2_PUBLIC_URL: env.R2_PUBLIC_URL?.replace(/\/$/, ""),
    NEXT_PUBLIC_POSTHOG_HOST: browserPostHogHost,
    POSTHOG_HOST: serverPostHogHost,
    BILLING_ENABLED: configuredStripeValues === stripeValues.length,
    POSTHOG_DISABLED: env.NEXT_PUBLIC_POSTHOG_DISABLED === "1",
    POSTHOG_BROWSER_ENABLED:
      env.NEXT_PUBLIC_POSTHOG_DISABLED !== "1" &&
      env.NEXT_PUBLIC_APP_ENV !== "production" &&
      configuredBrowserPostHogValues === browserPostHogValues.length,
    POSTHOG_SERVER_ENABLED:
      env.NEXT_PUBLIC_POSTHOG_DISABLED !== "1" &&
      env.NODE_ENV !== "test" &&
      env.NEXT_PUBLIC_APP_ENV !== "production" &&
      configuredServerPostHogValues === serverPostHogValues.length,
  };
}

export function getEnv() {
  return parseEnv(process.env);
}
