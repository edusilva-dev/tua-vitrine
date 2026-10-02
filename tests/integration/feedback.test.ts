import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/server/db";
import {
  createPlatformFeedback,
  createStorefrontFeedback,
  getStorefrontFeedbackSummary,
} from "@/modules/feedback/server/service";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (!["localhost", "127.0.0.1", "db"].includes(url.hostname) || url.pathname !== "/tuavitrine_test")
  throw new Error("Testes de feedback exigem PostgreSQL local isolado tuavitrine_test.");

let storeId = "";
let otherStoreId = "";
let sessionId = "";

beforeAll(async () => {
  const stores = await Promise.all([
    db.store.create({
      data: { name: "Feedback fixture", slug: `feedback-${randomUUID()}` },
    }),
    db.store.create({
      data: { name: "Other feedback fixture", slug: `feedback-other-${randomUUID()}` },
    }),
  ]);
  const session = await db.anonymousSession.create({
    data: {
      tokenHash: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  storeId = stores[0].id;
  otherStoreId = stores[1].id;
  sessionId = session.id;
});

afterAll(async () => {
  await db.store.deleteMany({ where: { id: { in: [storeId, otherStoreId] } } });
  await db.anonymousSession.deleteMany({ where: { id: sessionId } });
});

test("salva feedback, resume a vitrine e isola lojas", async () => {
  await Promise.all([
    createStorefrontFeedback({ storeId }, sessionId, {
      kind: "FOUND",
      rating: 5,
      message: "Encontrei rapidamente o que precisava.",
      context: "GENERAL",
    }),
    createStorefrontFeedback({ storeId }, sessionId, {
      kind: "NOT_FOUND",
      rating: 2,
      message: "Não encontrei uma camiseta verde.",
      context: "SEARCH_EMPTY",
    }),
    createStorefrontFeedback({ storeId: otherStoreId }, sessionId, {
      kind: "PROBLEM",
      rating: 1,
      message: "Comentário de outra loja.",
      context: "GENERAL",
    }),
    createPlatformFeedback({ storeId }, null, {
      kind: "PRAISE",
      rating: 5,
      message: "O cadastro de produtos ficou muito simples.",
      context: "/admin/support",
    }),
  ]);
  const summary = await getStorefrontFeedbackSummary({ storeId });

  expect(summary).toMatchObject({
    total: 2,
    averageRating: 3.5,
    found: 1,
    notFound: 1,
    problems: 0,
  });
  expect(summary.recent.map((item) => item.message)).not.toContain("Comentário de outra loja.");
  expect(await db.feedback.count({ where: { storeId, source: "PLATFORM" } })).toBe(1);
});

test("o banco recusa nota fora da escala", async () => {
  let rejected = false;

  try {
    await db.feedback.create({
      data: {
        storeId,
        sessionId,
        source: "STOREFRONT",
        kind: "FOUND",
        rating: 6,
        context: "GENERAL",
      },
    });
  } catch {
    rejected = true;
  }

  expect(rejected).toBe(true);
});
