import { db } from "@/lib/server/db";
import { logger } from "@/lib/server/logger";
import { isVercelBlobReference, r2StorageAdapter } from "@/lib/server/storage-adapter";

const argumentsList = process.argv.slice(2);
const apply = argumentsList.includes("--apply");
const unknownArguments = argumentsList.filter((argument) => argument !== "--apply");

async function main() {
  if (unknownArguments.length > 0) {
    throw new Error("Use sem argumentos para simular ou --apply para migrar.");
  }

  const assets = (
    await db.asset.findMany({
      select: { id: true, storeId: true, storageKey: true },
      orderBy: { createdAt: "asc" },
    })
  ).filter((asset) => isVercelBlobReference(asset.storageKey));

  if (!apply) {
    logger.info({ candidates: assets.length }, "Simulação da migração para o R2 concluída.");

    return;
  }

  let migrated = 0;
  const failures: { id: string; message: string }[] = [];

  for (const asset of assets) {
    const key = `stores/${asset.storeId}/${asset.id}.webp`;

    try {
      const response = await fetch(asset.storageKey, { cache: "no-store" });

      if (!response.ok) throw new Error(`download retornou HTTP ${response.status}`);

      await r2StorageAdapter.put(key, new Uint8Array(await response.arrayBuffer()));

      const updated = await db.asset.updateMany({
        where: { id: asset.id, storageKey: asset.storageKey },
        data: { storageKey: key },
      });

      if (updated.count !== 1) {
        await r2StorageAdapter.remove(key);
        throw new Error("a referência mudou durante a migração");
      }

      migrated += 1;
    } catch (error) {
      failures.push({
        id: asset.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info({ candidates: assets.length, migrated, failures }, "Migração para o R2 concluída.");

  if (failures.length > 0) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  logger.error({ err: error }, "Migração para o R2 falhou.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
