import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import { sendSupportRequest } from "@/modules/support/server/service";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !(["localhost", "127.0.0.1", "db"].includes(url.hostname) && url.pathname === "/tuavitrine_test")
)
  throw new Error("Testes de suporte exigem PostgreSQL local isolado tuavitrine_test.");

let storeId = "";
let userId = "";

beforeAll(async () => {
  userId = `support-${randomUUID()}`;
  const user = await db.user.create({
    data: {
      id: userId,
      name: "Lojista Teste",
      email: `${userId}@example.com`,
      emailVerified: true,
    },
  });
  const store = await db.store.create({
    data: {
      name: "Loja suporte",
      slug: `support-${randomUUID()}`,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  storeId = store.id;
});
afterAll(async () => {
  await db.store.deleteMany({ where: { id: storeId } });
  await db.user.deleteMany({ where: { id: userId } });
});
const input = {
  category: "TECHNICAL",
  subject: "Produto não publica",
  message: "Ao salvar o produto, ele continua aparecendo como rascunho.",
} as const;

test("persiste exatamente um chamado antes de notificar", async () => {
  let called = 0;
  const result = await sendSupportRequest({ storeId }, userId, input, {
    supportEmail: "suporte@example.com",
    sendEmail: async () => {
      called += 1;
    },
  });

  expect(result.notificationSent).toBe(true);
  expect(called).toBe(1);
  expect(await db.supportRequest.count({ where: { id: result.id, storeId } })).toBe(1);
  expect(
    await db.supportRequest.findUnique({
      where: { id: result.id },
      select: { notificationStatus: true, replyEmail: true },
    })
  ).toEqual({ notificationStatus: "SENT", replyEmail: `${userId}@example.com` });
});
test("falha do provedor preserva o chamado e marca a notificação", async () => {
  const result = await sendSupportRequest({ storeId }, userId, input, {
    supportEmail: "suporte@example.com",
    sendEmail: async () => {
      throw new Error("provider unavailable");
    },
  });

  expect(result.notificationSent).toBe(false);
  expect(
    await db.supportRequest.findUnique({
      where: { id: result.id },
      select: { status: true, notificationStatus: true, notificationErrorCode: true },
    })
  ).toEqual({
    status: "NEW",
    notificationStatus: "FAILED",
    notificationErrorCode: "EMAIL_DELIVERY_FAILED",
  });
});
