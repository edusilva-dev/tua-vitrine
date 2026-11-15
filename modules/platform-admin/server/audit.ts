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

export async function writeAdminAuditEvent(event: AdminAuditWrite): Promise<void> {
  await db.adminAuditEvent.create({ data: event });
}
