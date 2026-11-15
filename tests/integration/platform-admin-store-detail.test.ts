import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { queryPlatformStoreDetail } from "@/modules/platform-admin/server/store-detail";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de detalhe do Super Admin exigem o banco local isolado tuavitrine_test.");
}

const marker = randomUUID();
const now = new Date("2026-11-15T15:00:00.000Z");
const userId = `platform-detail-${marker}`;
let storeId = "";

beforeAll(async () => {
  const store = await db.store.create({
    data: {
      name: `Loja detalhe ${marker}`,
      slug: `store-detail-${marker}`,
      status: "ACTIVE",
      whatsapp: "+5511999999999",
      onboardingCompletedAt: new Date("2026-11-01T12:00:00.000Z"),
      members: {
        create: {
          role: "OWNER",
          user: {
            create: {
              id: userId,
              name: "Responsável da loja",
              email: `detail.${marker}@example.test`,
              emailVerified: true,
            },
          },
        },
      },
      subscription: {
        create: {
          plan: "ESSENTIAL",
          status: "ACTIVE",
          stripeCustomerId: `cus_detail_${marker}`,
          stripeSubscriptionId: `sub_detail_${marker}`,
          currentPeriodEnd: new Date("2026-12-01T12:00:00.000Z"),
        },
      },
      products: {
        create: [
          { name: "Publicado", description: "A", priceCents: 1000, published: true },
          { name: "Oculto", description: "B", priceCents: 2000, published: false },
          {
            name: "Arquivado",
            description: "C",
            priceCents: 3000,
            published: true,
            archivedAt: new Date("2026-11-10T12:00:00.000Z"),
          },
        ],
      },
    },
    select: { id: true },
  });

  storeId = store.id;
});

afterAll(async () => {
  await db.store.deleteMany({ where: { id: storeId } });
  await db.user.deleteMany({ where: { id: userId } });
});

test("reúne identidade, catálogo e plano efetivo sem consultar serviços externos", async () => {
  const detail = await queryPlatformStoreDetail(storeId, now);

  expect(detail).toMatchObject({
    id: storeId,
    status: "ACTIVE",
    products: { published: 1, unpublished: 1, archived: 1, total: 3 },
    plan: { plan: "ESSENTIAL", source: "SUBSCRIPTION" },
    subscription: {
      status: "ACTIVE",
      stripeCustomerId: `cus_detail_${marker}`,
      stripeSubscriptionId: `sub_detail_${marker}`,
    },
  });
  expect(detail?.members).toEqual([
    expect.objectContaining({ userId, role: "OWNER", emailVerified: true }),
  ]);
  expect(detail?.createdAt).toEndWith("Z");
  expect(detail?.onboardingCompletedAt).toBe("2026-11-01T12:00:00.000Z");
});

test("representa trial interno, plano Free e loja inexistente com a mesma regra de permissões", async () => {
  const trialStore = await db.store.create({
    data: {
      name: `Trial ${marker}`,
      slug: `trial-detail-${marker}`,
      trialStartedAt: new Date("2026-11-10T15:00:00.000Z"),
    },
    select: { id: true },
  });
  const freeStore = await db.store.create({
    data: { name: `Free ${marker}`, slug: `free-detail-${marker}` },
    select: { id: true },
  });

  try {
    expect(await queryPlatformStoreDetail(trialStore.id, now)).toMatchObject({
      plan: { plan: "PROFESSIONAL", source: "INTERNAL_TRIAL" },
      subscription: null,
    });
    expect(await queryPlatformStoreDetail(freeStore.id, now)).toMatchObject({
      plan: { plan: "FREE", source: "FREE" },
      subscription: null,
    });
    expect(await queryPlatformStoreDetail(randomUUID(), now)).toBeNull();
    expect(await queryPlatformStoreDetail("identificador-invalido", now)).toBeNull();
  } finally {
    await db.store.deleteMany({ where: { id: { in: [trialStore.id, freeStore.id] } } });
  }
});
