import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";
import { r2StorageAdapter } from "@/lib/server/storage-adapter";

const storeId = "00000000-0000-0000-0000-000000000000";
const key = `stores/${storeId}/${randomUUID()}.webp`;
const payload = new TextEncoder().encode("tua-vitrine-r2-check");

try {
  if (getEnv().STORAGE_DRIVER !== "r2")
    throw new Error("As quatro variáveis do R2 são obrigatórias.");

  await r2StorageAdapter.put(key, payload);
  const stored = await r2StorageAdapter.get(key);

  if (!stored?.equals(payload)) throw new Error("O conteúdo lido do R2 difere do enviado.");

  logger.info({ bucket: getEnv().R2_BUCKET_NAME }, "Gravação e leitura no R2 validadas.");
} catch (error) {
  logger.error({ err: error }, "Validação do R2 falhou.");
  process.exitCode = 1;
} finally {
  await r2StorageAdapter.remove(key).catch(() => undefined);
}
