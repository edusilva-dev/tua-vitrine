import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { resolvePlatformAdmin } from "@/modules/platform-admin/server/access";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de Super Admin exigem o banco local isolado tuavitrine_test.");
}

const prefix = randomUUID();
const activeUserId = `platform-admin-active-${prefix}`;
const commonUserId = `platform-admin-common-${prefix}`;
const unverifiedUserId = `platform-admin-unverified-${prefix}`;
const revokedUserId = `platform-admin-revoked-${prefix}`;
const userIds = [activeUserId, commonUserId, unverifiedUserId, revokedUserId];

beforeAll(async () => {
  await db.user.createMany({
    data: [
      {
        id: activeUserId,
        name: "Admin ativo",
        email: `${activeUserId}@example.test`,
        emailVerified: true,
      },
      {
        id: commonUserId,
        name: "Usuário comum",
        email: `${commonUserId}@example.test`,
        emailVerified: true,
      },
      {
        id: unverifiedUserId,
        name: "Admin não verificado",
        email: `${unverifiedUserId}@example.test`,
        emailVerified: false,
      },
      {
        id: revokedUserId,
        name: "Admin revogado",
        email: `${revokedUserId}@example.test`,
        emailVerified: true,
      },
    ],
  });
  await db.platformAdmin.createMany({
    data: [
      { userId: activeUserId },
      { userId: unverifiedUserId },
      { userId: revokedUserId, revokedAt: new Date() },
    ],
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
});

test("resolve apenas concessão ativa de usuário com e-mail verificado", async () => {
  expect(await resolvePlatformAdmin(activeUserId)).toMatchObject({
    userId: activeUserId,
    name: "Admin ativo",
    email: `${activeUserId}@example.test`,
  });
  expect(await resolvePlatformAdmin(commonUserId)).toBeNull();
  expect(await resolvePlatformAdmin(unverifiedUserId)).toBeNull();
  expect(await resolvePlatformAdmin(revokedUserId)).toBeNull();
  expect(await resolvePlatformAdmin(`missing-${prefix}`)).toBeNull();
});

test("revogação remove o acesso imediatamente e não altera associações de loja", async () => {
  const store = await db.store.create({
    data: {
      name: "Loja do administrador",
      slug: `platform-admin-${prefix}`,
      members: { create: { userId: activeUserId, role: "OWNER" } },
    },
    select: { id: true },
  });

  await db.platformAdmin.update({
    where: { userId: activeUserId },
    data: { revokedAt: new Date() },
  });

  expect(await resolvePlatformAdmin(activeUserId)).toBeNull();
  expect(
    await db.storeMember.findUnique({
      where: { storeId_userId: { storeId: store.id, userId: activeUserId } },
    })
  ).not.toBeNull();

  await db.store.delete({ where: { id: store.id } });
});
