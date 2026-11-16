import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import {
  endStoreTrial,
  grantManualPlan,
  setStoreBlocked,
  setStorePublished,
} from "@/modules/platform-admin/server/actions";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
)
  throw new Error("Testes de ações exigem o banco local isolado tuavitrine_test.");

const marker = randomUUID();
let storeId = "";
let otherStoreId = "";
let adminUserId = "";
let grantId = "";
const authorize = async () => ({ grantId });
const confirmation = {
  reason: "Correção operacional solicitada pelo lojista.",
  confirmed: true,
} as const;

beforeAll(async () => {
  adminUserId = `actions-admin-${marker}`;
  const user = await db.user.create({
    data: {
      id: adminUserId,
      name: "Admin Actions",
      email: `${adminUserId}@example.test`,
      emailVerified: true,
      platformAdmin: { create: {} },
    },
    select: { platformAdmin: { select: { id: true } } },
  });

  if (!user.platformAdmin) throw new Error("Fixture de administrador não foi criada.");

  grantId = user.platformAdmin.id;
  const stores = await Promise.all([
    db.store.create({
      data: {
        name: "Actions fixture",
        slug: `actions-${marker}`,
        whatsapp: "+5511999999999",
        onboardingCompletedAt: new Date(),
        trialStartedAt: new Date(),
      },
    }),
    db.store.create({ data: { name: "Other actions fixture", slug: `actions-other-${marker}` } }),
  ]);

  storeId = stores[0].id;
  otherStoreId = stores[1].id;
});
afterAll(async () => {
  await db.store.deleteMany({ where: { id: { in: [storeId, otherStoreId] } } });
  await db.adminAuditEvent.deleteMany({ where: { platformAdminId: grantId } });
  await db.user.deleteMany({ where: { id: adminUserId } });
});
test("bloqueia, reativa, publica e despublica somente a loja alvo", async () => {
  await setStoreBlocked(storeId, true, confirmation, authorize);
  expect(
    await db.store.findUniqueOrThrow({ where: { id: storeId }, select: { adminBlockedAt: true } })
  ).not.toMatchObject({ adminBlockedAt: null });
  expect(
    (await db.store.findUniqueOrThrow({ where: { id: otherStoreId } })).adminBlockedAt
  ).toBeNull();
  await expect(setStoreBlocked(storeId, true, confirmation, authorize)).rejects.toThrow(
    "já está bloqueada"
  );
  await setStoreBlocked(storeId, false, confirmation, authorize);
  await setStorePublished(storeId, true, confirmation, authorize);
  expect((await db.store.findUniqueOrThrow({ where: { id: storeId } })).status).toBe("ACTIVE");
  await setStorePublished(storeId, false, confirmation, authorize);
  expect((await db.store.findUniqueOrThrow({ where: { id: storeId } })).status).toBe("DRAFT");
  expect(
    await db.adminAuditEvent.count({
      where: {
        storeId,
        action: {
          in: ["STORE_BLOCK", "STORE_UNBLOCK", "STOREFRONT_PUBLISH", "STOREFRONT_UNPUBLISH"],
        },
      },
    })
  ).toBe(5);
});
test("encerra trial e concessão temporária governa os limites até expirar", async () => {
  const now = new Date("2026-11-16T12:00:00.000Z");

  await endStoreTrial(storeId, confirmation, now, authorize);
  expect((await getEntitlements({ storeId })).source).toBe("FREE");
  const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  await grantManualPlan(storeId, { ...confirmation, plan: "PROFESSIONAL", expiresAt }, authorize);
  expect(await getEntitlements({ storeId })).toMatchObject({
    plan: "PROFESSIONAL",
    source: "MANUAL_GRANT",
    productLimit: 1000,
  });
  await db.manualPlanGrant.update({
    where: { storeId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  expect(await getEntitlements({ storeId })).toMatchObject({
    plan: "FREE",
    source: "FREE",
    productLimit: 10,
  });
});
