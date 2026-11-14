import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { queryPlatformStores } from "@/modules/platform-admin/server/stores";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de busca do Super Admin exigem o banco local isolado tuavitrine_test.");
}

const prefix = randomUUID();
const marker = `Operação ${prefix}`;
const userIds: string[] = [];
const storeIds: string[] = [];
const now = new Date("2026-11-13T12:00:00.000Z");
let freeStoreId = "";
let trialStoreId = "";
let essentialStoreId = "";
let professionalStoreId = "";
let canceledStoreId = "";

async function createStore(
  suffix: string,
  options: {
    status?: "DRAFT" | "ACTIVE";
    trialStartedAt?: Date;
    subscription?: {
      plan: "ESSENTIAL" | "PROFESSIONAL";
      status: "ACTIVE" | "CANCELED";
      customer: string;
      id: string;
    };
  } = {}
) {
  const userId = `platform-store-${suffix}-${prefix}`;
  const email = `${suffix}.${prefix}@example.test`;
  const store = await db.store.create({
    data: {
      name: `${marker} ${suffix}`,
      slug: `operation-${suffix}-${prefix}`,
      status: options.status ?? "ACTIVE",
      ...((options.status ?? "ACTIVE") === "ACTIVE"
        ? { whatsapp: "+5511999999999", onboardingCompletedAt: now }
        : {}),
      ...(options.trialStartedAt ? { trialStartedAt: options.trialStartedAt } : {}),
      members: {
        create: {
          role: "OWNER",
          user: {
            create: { id: userId, name: `Responsável ${suffix}`, email, emailVerified: true },
          },
        },
      },
      ...(options.subscription
        ? {
            subscription: {
              create: {
                plan: options.subscription.plan,
                status: options.subscription.status,
                stripeCustomerId: options.subscription.customer,
                stripeSubscriptionId: options.subscription.id,
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  userIds.push(userId);
  storeIds.push(store.id);

  return { id: store.id, email };
}

beforeAll(async () => {
  freeStoreId = (await createStore("free")).id;
  trialStoreId = (
    await createStore("trial", {
      status: "DRAFT",
      trialStartedAt: new Date("2026-11-10T12:00:00.000Z"),
    })
  ).id;
  essentialStoreId = (
    await createStore("essential", {
      subscription: {
        plan: "ESSENTIAL",
        status: "ACTIVE",
        customer: `cus_essential_${prefix}`,
        id: `sub_essential_${prefix}`,
      },
    })
  ).id;
  professionalStoreId = (
    await createStore("professional", {
      subscription: {
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        customer: `cus_professional_${prefix}`,
        id: `sub_professional_${prefix}`,
      },
    })
  ).id;
  canceledStoreId = (
    await createStore("canceled", {
      subscription: {
        plan: "PROFESSIONAL",
        status: "CANCELED",
        customer: `cus_canceled_${prefix}`,
        id: `sub_canceled_${prefix}`,
      },
    })
  ).id;

  for (let index = 0; index < 17; index += 1) await createStore(`page-${index}`);
});

afterAll(async () => {
  await db.store.deleteMany({ where: { id: { in: storeIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
});

test("busca por nome, slug, e-mail, UUID e identificadores Stripe", async () => {
  const byName = await queryPlatformStores({ q: `${marker} ESSENTIAL` }, now);
  const bySlug = await queryPlatformStores({ q: `operation-professional-${prefix}` }, now);
  const byEmail = await queryPlatformStores({ q: `essential.${prefix}@EXAMPLE.TEST` }, now);
  const byUuid = await queryPlatformStores({ q: freeStoreId }, now);
  const byCustomer = await queryPlatformStores({ q: `cus_canceled_${prefix}` }, now);
  const bySubscription = await queryPlatformStores({ q: `sub_essential_${prefix}` }, now);

  expect(byName.items.map(({ id }) => id)).toEqual([essentialStoreId]);
  expect(bySlug.items.map(({ id }) => id)).toEqual([professionalStoreId]);
  expect(byEmail.items.map(({ id }) => id)).toEqual([essentialStoreId]);
  expect(byUuid.items.map(({ id }) => id)).toEqual([freeStoreId]);
  expect(byCustomer.items.map(({ id }) => id)).toEqual([canceledStoreId]);
  expect(bySubscription.items.map(({ id }) => id)).toEqual([essentialStoreId]);
  expect((await queryPlatformStores({ q: randomUUID() }, now)).items).toEqual([]);
});

test("filtra pelo plano efetivo, estado e assinatura", async () => {
  const professional = await queryPlatformStores({ q: marker, plan: "PROFESSIONAL" }, now);
  const free = await queryPlatformStores({ q: marker, plan: "FREE" }, now);
  const draft = await queryPlatformStores({ q: marker, status: "DRAFT" }, now);
  const activeSubscription = await queryPlatformStores({ q: marker, subscription: "ACTIVE" }, now);
  const withoutSubscription = await queryPlatformStores({ q: marker, subscription: "NONE" }, now);

  expect(new Set(professional.items.map(({ id }) => id))).toEqual(
    new Set([trialStoreId, professionalStoreId])
  );
  expect(free.items.map(({ id }) => id)).toContain(freeStoreId);
  expect(free.items.map(({ id }) => id)).toContain(canceledStoreId);
  expect(free.items.map(({ id }) => id)).not.toContain(trialStoreId);
  expect(draft.items.map(({ id }) => id)).toEqual([trialStoreId]);
  expect(new Set(activeSubscription.items.map(({ id }) => id))).toEqual(
    new Set([essentialStoreId, professionalStoreId])
  );
  expect(withoutSubscription.items.map(({ id }) => id)).toContain(freeStoreId);
  expect(withoutSubscription.items.map(({ id }) => id)).toContain(trialStoreId);
});

test("pagina em lotes fixos e retorna somente o DTO operacional", async () => {
  const firstPage = await queryPlatformStores({ q: marker }, now);
  const secondPage = await queryPlatformStores({ q: marker, page: 2 }, now);

  expect(firstPage.total).toBe(22);
  expect(firstPage.pageSize).toBe(20);
  expect(firstPage.items).toHaveLength(20);
  expect(secondPage.items).toHaveLength(2);
  expect(new Set([...firstPage.items, ...secondPage.items].map(({ id }) => id)).size).toBe(22);
  expect(Object.keys(firstPage.items[0] ?? {}).sort()).toEqual(
    ["createdAt", "id", "name", "owner", "plan", "slug", "status", "subscriptionStatus"].sort()
  );
});
