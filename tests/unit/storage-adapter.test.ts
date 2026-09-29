import { describe, expect, test } from "bun:test";
import {
  assetUrl,
  getAssetStorageForReference,
  isR2StorageReference,
  localStorageAdapter,
  r2StorageAdapter,
} from "@/lib/server/storage-adapter";

describe("referências de assets", () => {
  test("mantém uma rota estável da aplicação para os assets", () => {
    expect(assetUrl({ id: "asset-id", storageKey: "image.webp" })).toBe("/api/assets/asset-id");
  });

  test("entrega assets do R2 diretamente pela URL pública", () => {
    const storageKey =
      "stores/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp";

    try {
      process.env.R2_ACCOUNT_ID = "181a7469c4086eff988a76d87857df70";
      process.env.R2_ACCESS_KEY_ID = "test-r2-access-key";
      process.env.R2_SECRET_ACCESS_KEY = "test-r2-secret-access-key-with-32-characters";
      process.env.R2_BUCKET_NAME = "tua-vitrine";
      process.env.R2_PUBLIC_URL = "https://assets.vitrine.example";

      expect(assetUrl({ id: "asset-id", storageKey })).toBe(
        `https://assets.vitrine.example/${storageKey}`
      );
    } finally {
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;
      delete process.env.R2_PUBLIC_URL;
    }
  });

  test("resolve o adaptador pela referência persistida, não pelo driver atual", () => {
    const r2Key =
      "stores/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp";

    expect(getAssetStorageForReference("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp")).toBe(
      localStorageAdapter
    );
    expect(isR2StorageReference(r2Key)).toBe(true);
    expect(getAssetStorageForReference(r2Key)).toBe(r2StorageAdapter);
    expect(() => getAssetStorageForReference("../imagem.webp")).toThrow(/inválida/);
  });
});
