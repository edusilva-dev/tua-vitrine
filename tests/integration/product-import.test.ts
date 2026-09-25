import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { importProducts } from "@/modules/catalog/server/import/service";
import { createStore, saveWhatsapp } from "@/modules/stores/server/service";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (!["localhost", "127.0.0.1", "db"].includes(url.hostname) || url.pathname !== "/tuavitrine_test")
  throw new Error("Testes de integração exigem banco local isolado tuavitrine.");

let storeId = "";

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  const store = await createStore({ name: "Importação Excel", slug: `importacao-${suffix}` });

  storeId = store.id;
  await saveWhatsapp({ storeId }, { whatsapp: "+5511999999999" });
});

afterAll(async () => {
  if (storeId) await db.store.deleteMany({ where: { id: storeId } });

  await db.$disconnect();
});

const rows = [
  {
    row: 2,
    name: "Produto importado A",
    description: "Primeiro",
    priceCents: 1990,
    categoryName: "Importados",
    available: true,
  },
  {
    row: 3,
    name: "Produto importado B",
    description: "Segundo",
    priceCents: 2990,
    categoryName: "Importados",
    available: false,
  },
];

describe("confirmação da importação de produtos", () => {
  test("cria produtos publicados em transação e trata retry como idempotente", async () => {
    const key = randomUUID();
    const first = await importProducts({ storeId }, { rows }, key, {
      enabled: true,
      productLimit: 10,
    });
    const retry = await importProducts({ storeId }, { rows }, key, {
      enabled: true,
      productLimit: 10,
    });
    const saved = await db.product.findMany({
      where: { storeId, name: { startsWith: "Produto importado" } },
      orderBy: { name: "asc" },
    });

    expect(first).toEqual({ importedCount: 2, alreadyImported: false });
    expect(retry).toEqual({ importedCount: 2, alreadyImported: true });
    expect(saved).toHaveLength(2);
    expect(saved.every((product) => product.published)).toBe(true);
    expect(await db.category.count({ where: { storeId, name: "Importados" } })).toBe(1);
  });

  test("recusa plano sem importação e lote acima das vagas restantes", async () => {
    await expect(
      importProducts({ storeId }, { rows }, randomUUID(), { enabled: false, productLimit: 10 })
    ).rejects.toThrow("planos Essencial e Profissional");
    await expect(
      importProducts({ storeId }, { rows }, randomUUID(), { enabled: true, productLimit: 3 })
    ).rejects.toThrow("permite importar mais 1 produto");

    expect(
      await db.product.count({ where: { storeId, name: { startsWith: "Produto importado" } } })
    ).toBe(2);
  });
});
