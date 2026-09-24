import { describe, expect, test } from "bun:test";
import { assetUrl, isVercelBlobReference } from "@/lib/server/storage-adapter";

describe("referências de assets", () => {
  test("entrega Blob público diretamente pelo CDN", () => {
    const url = "https://abc.public.blob.vercel-storage.com/stores/store/image.webp";

    expect(isVercelBlobReference(url)).toBe(true);
    expect(assetUrl({ id: "asset-id", storageKey: url })).toBe(url);
  });

  test("não aceita hosts parecidos nem esquemas inseguros", () => {
    expect(isVercelBlobReference("https://blob.vercel-storage.com.evil.test/file")).toBe(false);
    expect(isVercelBlobReference("http://abc.public.blob.vercel-storage.com/file")).toBe(false);
  });

  test("mantém a rota da aplicação para storage local e legado", () => {
    expect(assetUrl({ id: "asset-id", storageKey: "image.webp" })).toBe("/api/assets/asset-id");
  });
});
