import "server-only";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { after } from "next/server";
import { db } from "./db";
import { getEnv } from "./env";
import { logger } from "./logger";
import { sendAccountEmail } from "./mail";

function createAuth() {
  const env = getEnv();

  if (env.AUTH_MODE !== "session" || !env.BETTER_AUTH_SECRET) {
    throw new Error("Autenticação por sessão não configurada.");
  }

  return betterAuth({
    appName: "tua vitrine",
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(env.APP_URL).origin],
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendAccountEmail(user.email, "Redefina sua senha", url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600,
      sendVerificationEmail: ({ user, url }) =>
        sendAccountEmail(user.email, "Confirme seu e-mail", url),
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: env.APP_URL.startsWith("https:"),
      backgroundTasks: {
        handler: (promise) =>
          after(async () => {
            try {
              await promise;
            } catch {
              logger.error("Falha na entrega do e-mail da conta. Verifique o serviço SMTP.");
            }
          }),
      },
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  instance ??= createAuth();

  return instance;
}
