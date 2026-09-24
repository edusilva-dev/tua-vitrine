import "server-only";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getEnv } from "./env";
import { type AssetStorage, getAssetStorage, isVercelBlobReference } from "./storage-adapter";

type Candidate = { id: string; storeId: string; storageKey: string };
type CleanupOptions = {
  apply?: boolean;
  graceHours?: number;
  limit?: number;
  storeId?: string;
  storage?: AssetStorage;
  journalDirectory?: string;
};

function isCandidate(value: unknown): value is Candidate {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

  return (
    typeof candidate.id === "string" &&
    uuid.test(candidate.id) &&
    typeof candidate.storeId === "string" &&
    uuid.test(candidate.storeId) &&
    typeof candidate.storageKey === "string" &&
    (/^[a-f0-9-]+\.webp$/.test(candidate.storageKey) || isVercelBlobReference(candidate.storageKey))
  );
}

/** A durable manifest bridges the database commit and nontransactional file removal. */
export async function cleanupAssets(options: CleanupOptions = {}) {
  const graceHours = options.graceHours ?? 24;
  const limit = options.limit ?? 100;

  if (!Number.isFinite(graceHours) || graceHours < 24) {
    throw new Error("A carência mínima para uploads é de 24 horas.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("O lote deve conter entre 1 e 1000 arquivos.");
  }

  const cutoff = new Date(Date.now() - graceHours * 3600000);
  const storage = options.storage ?? getAssetStorage();
  const directory = options.journalDirectory ?? join(getEnv().STORAGE_DIR, ".cleanup");
  const scope = options.storeId
    ? Prisma.sql`AND a."storeId" = ${options.storeId}::uuid`
    : Prisma.empty;
  const candidates = await db.$queryRaw<Candidate[]>`
    SELECT a.id, a."storeId", a."storageKey" FROM "Asset" a
    WHERE a."createdAt" < ${cutoff} ${scope}
      AND NOT EXISTS (SELECT 1 FROM "ProductImage" i WHERE i."assetId" = a.id)
      AND NOT EXISTS (SELECT 1 FROM "Store" s WHERE s."logoAssetId" = a.id)
    ORDER BY a."createdAt", a.id LIMIT ${limit}
  `;
  const result = {
    dryRun: !options.apply,
    candidates,
    deleted: 0,
    recovered: 0,
    skipped: 0,
    failures: [] as { id: string; message: string }[],
  };

  if (!options.apply) return result;

  await mkdir(directory, { recursive: true });

  async function removeFile(candidate: Candidate, manifest: string) {
    await storage.remove(candidate.storageKey);
    await unlink(manifest).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;

      throw error;
    });
  }

  for (const name of await readdir(directory)) {
    if (!/^[a-f0-9-]+\.json$/.test(name)) continue;

    try {
      const manifest = join(directory, name);
      const candidate: unknown = JSON.parse(await readFile(manifest, "utf8"));

      if (!isCandidate(candidate) || (options.storeId && candidate.storeId !== options.storeId)) {
        continue;
      }

      const present = await db.asset.count({
        where: { OR: [{ id: candidate.id }, { storageKey: candidate.storageKey }] },
      });

      if (present) continue;

      await removeFile(candidate, manifest);
      result.recovered += 1;
    } catch (error) {
      result.failures.push({ id: name, message: String(error) });
    }
  }

  for (const candidate of candidates) {
    try {
      const manifest = join(directory, `${candidate.id}.json`);

      // Exclusive creation preserves a complete existing journal during concurrent runs.
      await writeFile(manifest, JSON.stringify(candidate), { flag: "wx", flush: true }).catch(
        async (error: unknown) => {
          if (error instanceof Error && "code" in error && error.code === "EEXIST") {
            const existing: unknown = JSON.parse(await readFile(manifest, "utf8"));

            if (
              !isCandidate(existing) ||
              existing.id !== candidate.id ||
              existing.storeId !== candidate.storeId ||
              existing.storageKey !== candidate.storageKey
            ) {
              throw new Error("Manifesto inválido; exclusão suspensa para inspeção.");
            }

            return;
          }

          throw error;
        }
      );
      const deleted = await db.$executeRaw`
        DELETE FROM "Asset" a WHERE a.id = ${candidate.id}::uuid
          AND a."createdAt" < ${cutoff}
          AND NOT EXISTS (SELECT 1 FROM "ProductImage" i WHERE i."assetId" = a.id)
          AND NOT EXISTS (SELECT 1 FROM "Store" s WHERE s."logoAssetId" = a.id)
      `;

      if (!deleted) {
        result.skipped += 1;
        continue;
      }

      await removeFile(candidate, manifest);
      result.deleted += 1;
    } catch (error) {
      // FK conflicts preserve linked assets; I/O failures retain the manifest for the next run.
      result.failures.push({ id: candidate.id, message: String(error) });
    }
  }

  return result;
}
