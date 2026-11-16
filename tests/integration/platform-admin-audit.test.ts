import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { queryAdminAuditEvents } from "@/modules/platform-admin/server/audit-list";
import { writeAdminAuditEvent } from "@/modules/platform-admin/server/audit";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de auditoria exigem o banco local isolado tuavitrine_test.");
}

const marker = randomUUID();
const userId = `audit-admin-${marker}`;
let adminId = "";
let storeId = "";

beforeAll(async () => {
  const admin = await db.platformAdmin.create({
    data: {
      user: {
        create: {
          id: userId,
          name: `Auditor ${marker}`,
          email: `auditor.${marker}@example.test`,
          emailVerified: true,
        },
      },
    },
  });
  const store = await db.store.create({
    data: { name: `Loja auditada ${marker}`, slug: `audit-${marker}` },
  });
  adminId = admin.id;
  storeId = store.id;

  await writeAdminAuditEvent({
    platformAdminId: adminId,
    storeId,
    action: "STORE_BLOCK",
    result: "SUCCESS",
    resourceType: "Store",
    resourceId: storeId,
    reason: "Teste controlado de bloqueio da loja",
    before: { blocked: false, token: "não persistir" },
    after: { blocked: true, password: "não persistir" },
  });
  await writeAdminAuditEvent({
    platformAdminId: adminId,
    storeId,
    action: "STORE_UNBLOCK",
    result: "FAILURE",
    resourceType: "Store",
    resourceId: storeId,
    reason: "Teste controlado de falha na reativação",
    errorCode: "NO_CHANGE",
  });
});

afterAll(async () => {
  await db.adminAuditEvent.deleteMany({ where: { platformAdminId: adminId } });
  await db.store.deleteMany({ where: { id: storeId } });
  await db.platformAdmin.deleteMany({ where: { id: adminId } });
  await db.user.deleteMany({ where: { id: userId } });
});

test("filtra eventos e retorna snapshots sanitizados", async () => {
  const result = await queryAdminAuditEvents({
    storeId,
    adminId,
    action: "STORE_BLOCK",
    result: "SUCCESS",
  });

  expect(result.total).toBe(1);
  expect(result.items[0]).toMatchObject({
    action: "STORE_BLOCK",
    result: "SUCCESS",
    before: { blocked: false },
    after: { blocked: true },
    admin: { id: adminId },
    store: { id: storeId },
  });
});

test("pagina e separa resultados de sucesso e falha", async () => {
  const all = await queryAdminAuditEvents({ storeId });
  const failures = await queryAdminAuditEvents({ storeId, result: "FAILURE" });

  expect(all.total).toBe(2);
  expect(all.pageSize).toBe(20);
  expect(failures.items.map((event) => event.errorCode)).toEqual(["NO_CHANGE"]);
});
