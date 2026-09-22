import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { getMetrics, recordEvent, setLike } from "@/modules/analytics/server/service";
import type { ProductInput } from "@/modules/catalog/contracts";
import {
  archiveProduct,
  getProduct,
  listProducts,
  listProductsByIds,
  saveProduct,
} from "@/modules/catalog/server/service";
import { createStore, saveIdentity, saveWhatsapp } from "@/modules/stores/server/service";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(url.hostname) ||
  !["tuavitrine", "tuavitrine_test"].includes(url.pathname.slice(1))
)
  throw new Error("Testes de integração exigem banco local isolado tuavitrine.");

const run = randomUUID().slice(0, 8);
let storeId = "";
let otherStoreId = "";
let sessionId = "";
const input = (name = "Caneca artesanal"): ProductInput => ({
  name,
  description: "Cerâmica produzida à mão.",
  priceCents: 4500,
  available: true,
  categoryName: "Cerâmica",
  assetIds: [],
  variants: [
    { label: "Areia", options: { Cor: "Areia" }, priceCents: 4500, available: true },
    { label: "Azul", options: { Cor: "Azul" }, priceCents: 4900, available: false },
  ],
});

beforeAll(async () => {
  const first = await createStore({ name: "Teste integração A", slug: `integration-a-${run}` });
  const second = await createStore({ name: "Teste integração B", slug: `integration-b-${run}` });

  storeId = first.id;
  otherStoreId = second.id;
  await saveWhatsapp({ storeId }, { whatsapp: "+5511999999999" });
  await saveWhatsapp({ storeId: otherStoreId }, { whatsapp: "+5511988888888" });
  sessionId = (
    await db.anonymousSession.create({
      data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 86400000) },
    })
  ).id;
});
afterAll(async () => {
  if (sessionId) await db.anonymousSession.deleteMany({ where: { id: sessionId } });

  await db.store.deleteMany({ where: { id: { in: [storeId, otherStoreId].filter(Boolean) } } });
  await db.$disconnect();
});
describe("Catálogo e isolamento real PostgreSQL", () => {
  test("CRUD, preço final das variantes, categorias e arquivamento", async () => {
    const created = await saveProduct({ storeId }, input());

    expect(created.variants).toHaveLength(2);
    expect(created.variants.find((variant) => variant.label === "Azul")?.priceCents).toBe(4900);
    expect(created.category?.name).toBe("Cerâmica");
    const edited = await saveProduct(
      { storeId },
      { ...input("Caneca editada"), variants: created.variants },
      created.id
    );

    expect(edited.variants.map((variant) => variant.id).sort()).toEqual(
      created.variants.map((variant) => variant.id).sort()
    );
    expect(
      (await listProducts({ storeId }, { q: "editada" })).data.some(
        (product) => product.id === created.id
      )
    ).toBe(true);
    await archiveProduct({ storeId }, created.id);
    expect(await listProductsByIds({ storeId }, [created.id])).toEqual([]);
    await expect(getProduct({ storeId }, created.id)).rejects.toThrow("Produto não encontrado.");
  });
  test("não lê, modifica ou arquiva produto de outra loja", async () => {
    const product = await saveProduct({ storeId }, input("Isolado"));

    await expect(getProduct({ storeId: otherStoreId }, product.id)).rejects.toThrow();
    await expect(
      saveProduct({ storeId: otherStoreId }, input("Invadido"), product.id)
    ).rejects.toThrow();
    await expect(archiveProduct({ storeId: otherStoreId }, product.id)).rejects.toThrow();
    expect(await listProductsByIds({ storeId: otherStoreId }, [product.id])).toEqual([]);
    expect((await getProduct({ storeId }, product.id)).name).toBe("Isolado");
  });
  test("FKs compostas recusam categoria, logo, variante/opção e idempotência cruzadas", async () => {
    const first = await saveProduct({ storeId }, input("Primeiro"));
    const second = await saveProduct({ storeId: otherStoreId }, input("Segundo"));

    await expect(
      Promise.resolve(
        db.product.update({
          where: { id: first.id },
          data: { categoryId: second.category?.id ?? "" },
        })
      )
    ).rejects.toThrow();
    const asset = await db.asset.create({
      data: {
        storeId: otherStoreId,
        storageKey: `${randomUUID()}.webp`,
        mime: "image/webp",
        bytes: 10,
        width: 1,
        height: 1,
      },
    });

    await expect(
      Promise.resolve(db.store.update({ where: { id: storeId }, data: { logoAssetId: asset.id } }))
    ).rejects.toThrow();
    await expect(
      Promise.resolve(
        db.idempotency.create({
          data: { storeId, productId: second.id, key: randomUUID(), requestHash: "x" },
        })
      )
    ).rejects.toThrow();
    const option = await db.productOption.findFirstOrThrow({ where: { productId: second.id } });
    const value = await db.productOptionValue.findFirstOrThrow({ where: { optionId: option.id } });

    await expect(
      Promise.resolve(
        db.variantOptionValue.create({
          data: {
            storeId,
            productId: first.id,
            variantId: first.variants[0]?.id ?? "",
            optionId: option.id,
            valueId: value.id,
          },
        })
      )
    ).rejects.toThrow();
  });
  test("rollback completo quando variante inválida é detectada após update", async () => {
    const created = await saveProduct({ storeId }, input("Original"));
    const count = await db.product.count({ where: { storeId } });

    await expect(
      saveProduct(
        { storeId },
        {
          ...input("Nome que não deve salvar"),
          variants: [{ ...input().variants[0], id: randomUUID() }],
        },
        created.id
      )
    ).rejects.toThrow();
    expect((await getProduct({ storeId }, created.id)).name).toBe("Original");
    expect(await db.product.count({ where: { storeId } })).toBe(count);
    expect((await getProduct({ storeId }, created.id)).variants).toHaveLength(2);
  });
  test("idempotência concorrente cria exatamente um produto", async () => {
    const key = randomUUID();
    const payload = { ...input("Idempotente"), categoryName: "" };
    const [first, second] = await Promise.all([
      saveProduct({ storeId }, payload, undefined, key),
      saveProduct({ storeId }, payload, undefined, key),
    ]);

    expect(first.id).toBe(second.id);
    expect(await db.product.count({ where: { storeId, name: "Idempotente" } })).toBe(1);
    await expect(
      saveProduct({ storeId }, input("Outro payload"), undefined, key)
    ).rejects.toThrow();
  });
  test("slug normalizado único e publicação bloqueia alteração do endereço", async () => {
    const draft = await createStore({ name: "Loja temporária", slug: `Acentuação-${run}` });

    try {
      expect(draft.slug).toBe(`acentuacao-${run}`);
      await expect(createStore({ name: "Duplicada", slug: draft.slug })).rejects.toThrow();
    } finally {
      await db.store.delete({ where: { id: draft.id } });
    }

    await expect(
      saveIdentity({ storeId }, { name: "Outro nome", slug: `slug-alterado-${run}` })
    ).rejects.toThrow();
  });
  test("eventos deduplicados e likes idempotentes reversíveis", async () => {
    const product = await saveProduct({ storeId }, input("Métricas"));
    const eventId = randomUUID();
    const baseline = await getMetrics({ storeId });

    await recordEvent({ storeId }, sessionId, { eventId, type: "STORE_VIEW" });
    await recordEvent({ storeId }, sessionId, { eventId, type: "STORE_VIEW" });
    await recordEvent({ storeId }, sessionId, {
      eventId: randomUUID(),
      type: "PRODUCT_VIEW",
      productId: product.id,
    });
    await recordEvent({ storeId }, sessionId, {
      eventId: randomUUID(),
      type: "PRODUCT_VIEW",
      productId: product.id,
    });
    await setLike({ storeId }, sessionId, product.id, true);
    await setLike({ storeId }, sessionId, product.id, true);
    const metrics = await getMetrics({ storeId });

    expect(metrics.impressions).toBe(baseline.impressions + 1);
    expect(metrics.productViews).toBe(baseline.productViews + 1);
    expect(metrics.totalLikes).toBe(baseline.totalLikes + 1);
    await setLike({ storeId }, sessionId, product.id, false);
    expect((await getMetrics({ storeId })).totalLikes).toBe(baseline.totalLikes);
    await expect(
      recordEvent({ storeId: otherStoreId }, sessionId, {
        eventId: randomUUID(),
        type: "PRODUCT_VIEW",
        productId: product.id,
      })
    ).rejects.toThrow();
  });
  test("preço negativo é rejeitado pelo banco", async () => {
    const product = await saveProduct({ storeId }, input("Preço"));

    await expect(
      Promise.resolve(db.product.update({ where: { id: product.id }, data: { priceCents: -1 } }))
    ).rejects.toThrow();
  });
});
