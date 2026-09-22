import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => /^postgres(ql)?:/.test(url), "Use PostgreSQL."),
  APP_URL: z.string().url(),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  LOCAL_ONLY: z.literal("true"),
  STORAGE_DIR: z.string().min(1).default("./work/storage"),
});

export function getEnv() {
  const env = schema.parse(process.env);

  if (env.APP_ENV !== "development" && env.APP_ENV !== "test") {
    throw new Error(
      "Este protótipo não tem autenticação e não pode iniciar em staging/production."
    );
  }

  const url = new URL(env.APP_URL);

  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(
      "APP_URL deve apontar para localhost enquanto a autenticação não estiver implementada."
    );
  }

  return env;
}
