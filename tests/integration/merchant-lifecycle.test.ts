import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { importProducts } from "@/modules/catalog/server/import/service";
import { archiveProduct, archiveProducts, saveProduct } from "@/modules/catalog/server/service";
import {
  createServerAnalytics,
  type ServerAnalyticsMessage,
} from "@/modules/observability/server/analytics";
import { createStore, saveWhatsapp } from "@/modules/stores/server/service";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (!["localhost", "127.0.0.1", "db"].includes(url.hostname) || url.pathname !== "/tuavitrine_test")
  throw new Error("Testes de integração exigem banco local isolado tuavitrine_test.");

const actorId = randomBytes(16).toString("hex");
const events: ServerAnalyticsMessage[] = [];
const observer = createServerAnalytics({
  getRuntime: () => ({
    client: { capture: (message) => events.push(message) },
    environment: "staging",
    release: "test-release",
  }),
});
let storeId = "";

beforeAll(async () => {
  await db.user.create({
    data: {
      id: actorId,
      name: "Observability test",
      email: `${actorId}@example.test`,
      emailVerified: true,
    },
  });
  const store = await createStore(
    { name: "Ciclo do lojista", slug: `merchant-${actorId}`, signupPlan: "PROFESSIONAL" },
    actorId,
    observer
  );

  storeId = store.id;
  await saveWhatsapp({ storeId }, { whatsapp: "+5511999999999" });
});

afterAll(async () => {
  if (storeId) await db.store.deleteMany({ where: { id: storeId } });

  await db.user.deleteMany({ where: { id: actorId } });
});

const product = (name: string) => ({
  name,
  description: "Descrição de teste",
  priceCents: 1500,
  discountPriceCents: null,
  available: true,
  categoryName: "",
  assetIds: [],
  variants: [],
});

test("marcos do lojista seguem commits, retries e a identidade da loja", async () => {
  expect(events.map(({ event }) => event)).toEqual(["store_created"]);
  expect(events[0]).toMatchObject({
    distinctId: actorId,
    groups: { store: storeId },
    properties: { store_id: storeId, plan: "FREE" },
  });

  const key = randomUUID();
  const first = await saveProduct(
    { storeId },
    product("Primeiro"),
    undefined,
    key,
    actorId,
    observer
  );

  expect(events.map(({ event }) => event)).toEqual([
    "store_created",
    "product_created",
    "store_published",
  ]);
  expect(events[1]).toMatchObject({
    distinctId: actorId,
    groups: { store: storeId },
    properties: {
      store_id: storeId,
      product_id: first.id,
      creation_method: "manual",
      is_first_product: true,
    },
  });
  expect(events[2]).toMatchObject({
    distinctId: actorId,
    groups: { store: storeId },
    properties: { store_id: storeId, plan: "PROFESSIONAL", product_count: 1 },
  });

  await saveProduct({ storeId }, product("Primeiro"), undefined, key, actorId, observer);
  await saveProduct(
    { storeId },
    product("Primeiro editado"),
    first.id,
    undefined,
    actorId,
    observer
  );
  expect(events).toHaveLength(3);

  const second = await saveProduct(
    { storeId },
    product("Segundo"),
    undefined,
    undefined,
    actorId,
    observer
  );

  expect(events.at(-1)).toMatchObject({
    event: "product_created",
    properties: { product_id: second.id, is_first_product: false },
  });
  expect(events.filter(({ event }) => event === "store_published")).toHaveLength(1);

  const rows = [
    {
      row: 2,
      name: "Importado A",
      description: "",
      priceCents: 1200,
      categoryName: "",
      available: true,
    },
    {
      row: 3,
      name: "Importado B",
      description: "",
      priceCents: 1300,
      categoryName: "",
      available: true,
    },
  ];
  const importKey = randomUUID();
  const beforeImport = events.length;

  expect(
    await importProducts(
      { storeId },
      { rows },
      importKey,
      { enabled: true, productLimit: 50 },
      actorId,
      observer
    )
  ).toEqual({ importedCount: 2, alreadyImported: false });
  await importProducts(
    { storeId },
    { rows },
    importKey,
    { enabled: true, productLimit: 50 },
    actorId,
    observer
  );
  const importedEvents = events.slice(beforeImport);

  expect(importedEvents).toHaveLength(2);
  expect(new Set(importedEvents.map(({ properties }) => properties.product_id)).size).toBe(2);
  expect(importedEvents.every(({ properties }) => properties.creation_method === "import")).toBe(
    true
  );
  expect(importedEvents.every(({ properties }) => !Array.isArray(properties.product_id))).toBe(
    true
  );

  await archiveProduct({ storeId }, first.id, actorId, observer);
  await archiveProducts({ storeId }, { productIds: [second.id] }, actorId, "bulk", observer);
  expect(events.slice(-2).map(({ properties }) => properties)).toEqual([
    expect.objectContaining({ store_id: storeId, product_count: 1, operation: "single" }),
    expect.objectContaining({ store_id: storeId, product_count: 1, operation: "bulk" }),
  ]);
  expect(
    events.every(({ distinctId, groups }) => distinctId === actorId && groups?.store === storeId)
  ).toBe(true);
});

test("falha da telemetria não desfaz criação ou exclusão", async () => {
  const failing = {
    productCreated: () => {
      throw new Error("Falha simulada");
    },
    storePublished: () => {
      throw new Error("Falha simulada");
    },
    productDeleted: () => {
      throw new Error("Falha simulada");
    },
  };
  const saved = await saveProduct(
    { storeId },
    product("Sem telemetria"),
    undefined,
    undefined,
    actorId,
    failing
  );

  expect(await db.product.findUnique({ where: { id: saved.id } })).not.toBeNull();
  await archiveProduct({ storeId }, saved.id, actorId, failing);
  expect((await db.product.findUnique({ where: { id: saved.id } }))?.archivedAt).not.toBeNull();

  const imported = await importProducts(
    { storeId },
    {
      rows: [
        {
          row: 2,
          name: "Importado sem telemetria",
          description: "",
          priceCents: 1500,
          categoryName: "",
          available: true,
        },
      ],
    },
    randomUUID(),
    { enabled: true, productLimit: 50 },
    actorId,
    failing
  );

  expect(imported.importedCount).toBe(1);
  expect(await db.product.count({ where: { storeId, name: "Importado sem telemetria" } })).toBe(1);

  const otherActorId = randomBytes(16).toString("hex");

  await db.user.create({
    data: {
      id: otherActorId,
      name: "Outro teste",
      email: `${otherActorId}@example.test`,
      emailVerified: true,
    },
  });

  try {
    const createdStore = await createStore(
      { name: "Loja sem telemetria", slug: `merchant-${otherActorId}` },
      otherActorId,
      {
        storeCreated: () => {
          throw new Error("Falha simulada");
        },
      }
    );

    expect(await db.storeMember.count({ where: { storeId: createdStore.id } })).toBe(1);
    await db.store.delete({ where: { id: createdStore.id } });
  } finally {
    await db.user.delete({ where: { id: otherActorId } });
  }
});
