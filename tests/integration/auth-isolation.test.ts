import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { resolveMemberStore } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { createStore, saveIdentity } from "@/modules/stores/server/service";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de autenticação exigem o banco local isolado tuavitrine_test.");
}

const prefix = randomUUID();
const firstUserId = `auth-test-a-${prefix}`;
const secondUserId = `auth-test-b-${prefix}`;
const stores: string[] = [];
let ownedStoreId = "";
let foreignStoreId = "";
let legacyStoreId = "";

beforeAll(async () => {
  await db.user.createMany({
    data: [
      {
        id: firstUserId,
        name: "Auth A",
        email: `${firstUserId}@example.test`,
        emailVerified: true,
      },
      {
        id: secondUserId,
        name: "Auth B",
        email: `${secondUserId}@example.test`,
        emailVerified: true,
      },
    ],
  });
  const first = await createStore({ name: "Owned draft", slug: `owned-${prefix}` }, firstUserId);

  ownedStoreId = first.id;
  stores.push(first.id);
  const second = await createStore(
    { name: "Other draft", slug: `foreign-${prefix}` },
    secondUserId
  );

  foreignStoreId = second.id;
  stores.push(second.id);
  const legacy = await createStore({ name: "Legacy draft", slug: `legacy-${prefix}` });

  legacyStoreId = legacy.id;
  stores.push(legacy.id);
});

afterAll(async () => {
  await db.store.deleteMany({ where: { id: { in: stores } } });
  await db.user.deleteMany({ where: { id: { in: [firstUserId, secondUserId] } } });
});

test("membership resolves only owned stores, with no fallback for stale or foreign selections", async () => {
  expect(await resolveMemberStore(firstUserId)).toEqual({ storeId: ownedStoreId });
  expect(await resolveMemberStore(firstUserId, ownedStoreId)).toEqual({ storeId: ownedStoreId });
  await expect(resolveMemberStore(firstUserId, foreignStoreId)).rejects.toThrow();
  await expect(resolveMemberStore(firstUserId, legacyStoreId)).rejects.toThrow();
  await expect(resolveMemberStore(firstUserId, randomUUID())).rejects.toThrow();
  await expect(resolveMemberStore(firstUserId, "invalid-cookie")).rejects.toThrow();
  await expect(resolveMemberStore(`missing-${prefix}`)).rejects.toThrow();
});

test("onboarding cannot claim another owner's same-name draft or an unowned legacy store", async () => {
  await expect(
    saveIdentity(null, { name: "Other draft", slug: `foreign-${prefix}` }, firstUserId)
  ).rejects.toThrow();
  await expect(
    saveIdentity(null, { name: "Legacy draft", slug: `legacy-${prefix}` }, firstUserId)
  ).rejects.toThrow();
  expect(await db.storeMember.count({ where: { storeId: legacyStoreId } })).toBe(0);
  expect(
    await db.storeMember.count({ where: { storeId: foreignStoreId, userId: firstUserId } })
  ).toBe(0);
  const resumed = await saveIdentity(
    null,
    { name: "Owned draft", slug: `owned-${prefix}` },
    firstUserId
  );

  expect(resumed.id).toBe(ownedStoreId);
});

test("store and ownership are created atomically, and a missing user rolls back creation", async () => {
  const slug = `rollback-${prefix}`;

  await expect(createStore({ name: "Rollback", slug }, `missing-${prefix}`)).rejects.toThrow();
  expect(await db.store.findUnique({ where: { slug } })).toBeNull();
  expect(
    await db.storeMember.findUnique({
      where: { storeId_userId: { storeId: ownedStoreId, userId: firstUserId } },
    })
  ).toMatchObject({ role: "OWNER" });
});

test("a conta não cria uma segunda loja e a revogação remove o acesso imediatamente", async () => {
  const slug = `second-${prefix}`;

  await expect(createStore({ name: "Second", slug }, firstUserId)).rejects.toThrow();
  expect(await db.store.findUnique({ where: { slug } })).toBeNull();
  await expect(
    Promise.resolve(
      db.storeMember.update({
        where: { storeId_userId: { storeId: ownedStoreId, userId: firstUserId } },
        data: { role: "VIEWER" },
      })
    )
  ).rejects.toThrow();
  await db.storeMember.delete({
    where: { storeId_userId: { storeId: ownedStoreId, userId: firstUserId } },
  });
  await expect(resolveMemberStore(firstUserId, ownedStoreId)).rejects.toThrow();
});
