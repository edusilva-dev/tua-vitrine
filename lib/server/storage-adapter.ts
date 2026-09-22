import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { getEnv } from "./env";

export interface AssetStorage {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
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
