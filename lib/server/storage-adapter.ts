import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
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

let r2Client: S3Client | undefined;

function r2Key(reference: string) {
  if (!/^stores\/[a-f0-9-]+\/[a-f0-9-]+\.webp$/.test(reference)) {
    throw new Error("Chave R2 inválida.");
  }

  return reference;
}

function getR2Client() {
  if (r2Client) return r2Client;

  const env = getEnv();

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error("As credenciais do R2 não estão configuradas.");
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return r2Client;
}

function getR2Bucket() {
  const bucket = getEnv().R2_BUCKET_NAME;

  if (!bucket) throw new Error("R2_BUCKET_NAME não está configurada.");

  return bucket;
}

async function readLegacyBlob(reference: string) {
  const response = await fetch(reference, { cache: "no-store" });

  if (response.status === 404) return null;

  if (!response.ok) throw new Error(`Falha ao ler imagem legada (${response.status}).`);

  return Buffer.from(await response.arrayBuffer());
}

export const r2StorageAdapter: AssetStorage = {
  async put(key, data) {
    const objectKey = r2Key(key);

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: objectKey,
        Body: data,
        ContentType: "image/webp",
        CacheControl: "public, max-age=2592000, immutable",
      })
    );

    return objectKey;
  },
  async get(reference) {
    if (isVercelBlobReference(reference)) return readLegacyBlob(reference);

    try {
      const result = await getR2Client().send(
        new GetObjectCommand({ Bucket: getR2Bucket(), Key: r2Key(reference) })
      );

      if (!result.Body) return null;

      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
        return null;

      throw error;
    }
  },
  async remove(reference) {
    if (isVercelBlobReference(reference)) return;

    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: r2Key(reference) })
    );
  },
};

export function getAssetStorage(): AssetStorage {
  const driver = getEnv().STORAGE_DRIVER;

  if (driver === "local") return localStorageAdapter;

  if (driver === "r2") return r2StorageAdapter;

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
