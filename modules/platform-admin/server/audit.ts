import "server-only";

import type { AdminAuditAction, AdminAuditResult, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";

export type AdminAuditWrite = {
  platformAdminId: string;
  storeId?: string;
  action: AdminAuditAction;
  result: AdminAuditResult;
  resourceType: string;
  resourceId: string;
  reason: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  errorCode?: string;
};

const ALLOWED_SNAPSHOT_KEYS = new Set([
  "blocked",
  "status",
  "trialEndedAt",
  "plan",
  "expiresAt",
  "emailVerified",
  "verificationEmailRequested",
  "currentPeriodEnd",
  "trialEnd",
  "cancelAtPeriodEnd",
  "hasInternalNote",
  "stripeSubscriptionId",
]);

export function sanitizeAuditSnapshot(value: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map(sanitizeAuditSnapshot);

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => ALLOWED_SNAPSHOT_KEYS.has(key))
      .map(([key, item]) => [key, sanitizeAuditSnapshot(item)])
  );
}

export async function writeAdminAuditEvent(event: AdminAuditWrite): Promise<void> {
  await db.adminAuditEvent.create({
    data: {
      ...event,
      ...(event.before === undefined ? {} : { before: sanitizeAuditSnapshot(event.before) }),
      ...(event.after === undefined ? {} : { after: sanitizeAuditSnapshot(event.after) }),
    },
  });
}
