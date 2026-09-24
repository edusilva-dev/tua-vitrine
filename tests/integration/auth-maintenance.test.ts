import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { cleanupAuth } from "@/lib/server/auth-maintenance";
import { db } from "@/lib/server/db";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de manutenção de autenticação exigem o banco tuavitrine_test.");
}

const prefix = `auth-maintenance-${randomUUID()}`;
const now = new Date("2026-09-24T12:00:00.000Z");
const old = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
const retained = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
const userId = `${prefix}-user`;
const oldSessionId = `${prefix}-session-old`;
const retainedSessionId = `${prefix}-session-retained`;
const oldVerificationId = `${prefix}-verification-old`;
const retainedVerificationId = `${prefix}-verification-retained`;
const oldRateLimitId = `${prefix}-rate-old`;
const retainedRateLimitId = `${prefix}-rate-retained`;

beforeAll(async () => {
  await db.user.create({
    data: {
      id: userId,
      name: "Auth maintenance fixture",
      email: `${prefix}@example.test`,
      emailVerified: true,
      sessions: {
        create: [
          { id: oldSessionId, token: `${prefix}-old`, expiresAt: old },
          { id: retainedSessionId, token: `${prefix}-retained`, expiresAt: retained },
        ],
      },
    },
  });
  await db.verification.createMany({
    data: [
      {
        id: oldVerificationId,
        identifier: `${prefix}-old`,
        value: "old",
        expiresAt: old,
      },
      {
        id: retainedVerificationId,
        identifier: `${prefix}-retained`,
        value: "retained",
        expiresAt: retained,
      },
    ],
  });
  await db.rateLimit.createMany({
    data: [
      { id: oldRateLimitId, key: `${prefix}-old`, count: 1, lastRequest: BigInt(old.getTime()) },
      {
        id: retainedRateLimitId,
        key: `${prefix}-retained`,
        count: 1,
        lastRequest: BigInt(retained.getTime()),
      },
    ],
  });
});

afterAll(async () => {
  await db.rateLimit.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.verification.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.user.deleteMany({ where: { id: userId } });
});

test("dry-run reports stale records without modifying authentication data", async () => {
  const result = await cleanupAuth({ now });

  expect(result.dryRun).toBe(true);
  expect(result.sessions.candidates).toContain(oldSessionId);
  expect(result.verifications.candidates).toContain(oldVerificationId);
  expect(result.rateLimits.candidates).toContain(oldRateLimitId);
  expect(await db.session.count({ where: { userId } })).toBe(2);
  expect(await db.user.count({ where: { id: userId } })).toBe(1);
});

test("apply removes only records beyond retention and is safe under concurrent runs", async () => {
  const results = await Promise.all([
    cleanupAuth({ now, apply: true }),
    cleanupAuth({ now, apply: true }),
  ]);

  expect(results.reduce((total, result) => total + result.sessions.deleted, 0)).toBe(1);
  expect(results.reduce((total, result) => total + result.verifications.deleted, 0)).toBe(1);
  expect(results.reduce((total, result) => total + result.rateLimits.deleted, 0)).toBe(1);
  expect(await db.session.findUnique({ where: { id: retainedSessionId } })).not.toBeNull();
  expect(
    await db.verification.findUnique({ where: { id: retainedVerificationId } })
  ).not.toBeNull();
  expect(await db.rateLimit.findUnique({ where: { id: retainedRateLimitId } })).not.toBeNull();
  expect(await db.user.findUnique({ where: { id: userId } })).not.toBeNull();
});

test("rejects batches above the operational safety limit", async () => {
  await expect(cleanupAuth({ limit: 1001, now })).rejects.toThrow("1000");
});
