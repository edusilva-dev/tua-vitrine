import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";
import { r2StorageAdapter } from "@/lib/server/storage-adapter";

const storeId = "00000000-0000-0000-0000-000000000000";
const key = `stores/${storeId}/${randomUUID()}.webp`;
const payload = new TextEncoder().encode("tua-vitrine-r2-check");

try {
  const env = getEnv();

  if (env.STORAGE_DRIVER !== "r2" || !env.R2_PUBLIC_URL)
    throw new Error("As cinco variáveis do R2 são obrigatórias.");

  await r2StorageAdapter.put(key, payload);
  const stored = await r2StorageAdapter.get(key);

  if (!stored?.equals(payload)) throw new Error("O conteúdo lido do R2 difere do enviado.");

  const publicResponse = await fetch(`${env.R2_PUBLIC_URL}/${key}`, { cache: "no-store" });
  const publicContent = Buffer.from(await publicResponse.arrayBuffer());

  if (!publicResponse.ok || !publicContent.equals(payload)) {
    throw new Error(`A URL pública do R2 retornou HTTP ${publicResponse.status}.`);
  }

  logger.info({ bucket: env.R2_BUCKET_NAME }, "Gravação e URL pública do R2 validadas.");
} catch (error) {
  logger.error({ err: error }, "Validação do R2 falhou.");
  process.exitCode = 1;
} finally {
  await r2StorageAdapter.remove(key).catch(() => undefined);
}
