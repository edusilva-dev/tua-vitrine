import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanupAssets } from "@/lib/server/asset-cleanup";
import { db } from "@/lib/server/db";
import type { AssetStorage } from "@/lib/server/storage-adapter";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(url.hostname) ||
  url.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de limpeza exigem PostgreSQL local de testes.");
}

let storeId = "";
let journalDirectory = "";
const removed: string[] = [];
const storage: AssetStorage = {
  async put() {},
  async get() {
    return null;
  },
  async remove(key) {
    removed.push(key);
  },
};

beforeAll(async () => {
  journalDirectory = await mkdtemp(join(tmpdir(), "tua-cleanup-"));
  const store = await db.store.create({
    data: { name: "Cleanup fixture", slug: `cleanup-${randomUUID()}` },
  });

  storeId = store.id;
});

afterAll(async () => {
  if (storeId) {
    await db.store.update({ where: { id: storeId }, data: { logoAssetId: null } });
    await db.store.delete({ where: { id: storeId } });
  }

  if (journalDirectory) await rm(journalDirectory, { recursive: true, force: true });
});

async function asset(old = true) {
  return db.asset.create({
    data: {
      storeId,
      storageKey: `${randomUUID()}.webp`,
      mime: "image/webp",
      bytes: 1,
      width: 1,
      height: 1,
      createdAt: new Date(Date.now() - (old ? 48 : 1) * 3600000),
    },
  });
}

test("dry-run preserves data; apply protects recent uploads, logos and archived product images", async () => {
  const orphan = await asset();
  const recent = await asset(false);
  const logo = await asset();
  const photo = await asset();

  await db.store.update({ where: { id: storeId }, data: { logoAssetId: logo.id } });
  await db.product.create({
    data: {
      storeId,
      name: "Archived fixture",
      description: "",
      priceCents: 100,
      archivedAt: new Date(),
      images: { create: { assetId: photo.id, position: 0 } },
    },
  });
  const dry = await cleanupAssets({ storeId, journalDirectory, storage });

  expect(dry.candidates.map((item) => item.id)).toEqual([orphan.id]);
  expect(dry.dryRun).toBe(true);
  expect(await readdir(journalDirectory)).toEqual([]);
  expect(await db.asset.count({ where: { storeId } })).toBe(4);
  const applied = await cleanupAssets({ storeId, journalDirectory, storage, apply: true });

  expect(applied.deleted).toBe(1);
  expect(applied.failures).toEqual([]);
  expect(removed).toEqual([orphan.storageKey]);
  expect(await db.asset.count({ where: { id: { in: [recent.id, logo.id, photo.id] } } })).toBe(3);
});

test("failed physical deletion is retried from durable manifest after DB commit", async () => {
  const orphan = await asset();
  const failing: AssetStorage = {
    ...storage,
    async remove() {
      throw new Error("fixture storage unavailable");
    },
  };
  const failed = await cleanupAssets({ storeId, journalDirectory, storage: failing, apply: true });

  expect(failed.failures).toHaveLength(1);
  expect(await db.asset.findUnique({ where: { id: orphan.id } })).toBeNull();
  expect(await readdir(journalDirectory)).toEqual([`${orphan.id}.json`]);
  const retried = await cleanupAssets({ storeId, journalDirectory, storage, apply: true });

  expect(retried.recovered).toBe(1);
  expect(removed).toContain(orphan.storageKey);
  expect(await readdir(journalDirectory)).toEqual([]);
});

test("cleanup rejects grace periods shorter than 24 hours", async () => {
  await expect(cleanupAssets({ storeId, graceHours: 23 })).rejects.toThrow("24 horas");
});

test("concurrent association cannot leave a linked image deleted", async () => {
  const orphan = await asset();
  const product = await db.product.create({
    data: { storeId, name: "Concurrent fixture", description: "", priceCents: 100 },
  });

  await Promise.allSettled([
    cleanupAssets({ storeId, journalDirectory, storage, apply: true }),
    db.productImage.create({
      data: { storeId, productId: product.id, assetId: orphan.id, position: 0 },
    }),
  ]);
  const linked = await db.productImage.count({ where: { assetId: orphan.id } });

  if (linked) {
    expect(await db.asset.findUnique({ where: { id: orphan.id } })).not.toBeNull();
    expect(removed).not.toContain(orphan.storageKey);

    return;
  }

  expect(await db.asset.findUnique({ where: { id: orphan.id } })).toBeNull();
  expect(removed).toContain(orphan.storageKey);
});
