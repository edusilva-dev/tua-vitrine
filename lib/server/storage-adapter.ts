import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { del, get, put } from "@vercel/blob";
import { getEnv } from "./env";

export interface AssetStorage {
  put(key: string, data: Uint8Array): Promise<string>;
  get(reference: string): Promise<Buffer | null>;
  remove(reference: string): Promise<void>;
}

function pathFor(key: string) {
  if (!/^[a-f0-9-]+\.webp$/.test(key)) throw new Error("Chave de arquivo inválida.");

  return join(resolve(getEnv().STORAGE_DIR), key);
}

export const localStorageAdapter: AssetStorage = {
  async put(key, data) {
    const path = pathFor(key);

    await mkdir(resolve(getEnv().STORAGE_DIR), { recursive: true });
    await writeFile(path, data, { flag: "wx" });

    return key;
  },
  async get(key) {
    try {
      return await readFile(pathFor(key));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;

      throw error;
    }
  },
  async remove(key) {
    try {
      await unlink(pathFor(key));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;

      throw error;
    }
  },
};

export const vercelBlobStorageAdapter: AssetStorage = {
  async put(key, data) {
    const blob = await put(key, Buffer.from(data), {
      access: "public",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
      contentType: "image/webp",
    });

    return blob.url;
  },
  async get(reference) {
    const result = await get(reference, { access: "public" });

    if (result?.statusCode !== 200) return null;

    return Buffer.from(await new Response(result.stream).arrayBuffer());
  },
  async remove(reference) {
    await del(reference);
  },
};

export function getAssetStorage(): AssetStorage {
  const driver = getEnv().STORAGE_DRIVER;

  if (driver === "local") return localStorageAdapter;

  if (driver === "vercel-blob") return vercelBlobStorageAdapter;

  throw new Error("O armazenamento de imagens está desabilitado.");
}

export function isVercelBlobReference(reference: string) {
  try {
    const url = new URL(reference);

    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function assetUrl(asset: { id: string; storageKey: string }) {
  return isVercelBlobReference(asset.storageKey) ? asset.storageKey : `/api/assets/${asset.id}`;
}
