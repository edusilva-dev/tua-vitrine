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
