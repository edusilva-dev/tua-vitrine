import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import {
  type AdminAuditItemDTO,
  type AdminAuditListDTO,
  adminAuditListInputSchema,
} from "../contracts/audit";
import { requirePlatformAdmin } from "./access";

const PAGE_SIZE = 20;

const select = {
  id: true,
  action: true,
  result: true,
  resourceType: true,
  resourceId: true,
  reason: true,
  before: true,
  after: true,
  errorCode: true,
  createdAt: true,
  platformAdmin: {
    select: { id: true, user: { select: { name: true, email: true } } },
  },
  store: { select: { id: true, name: true, slug: true } },
} as const;

type AuditRecord = Prisma.AdminAuditEventGetPayload<{ select: typeof select }>;

export function serializeAdminAuditEvent(event: AuditRecord): AdminAuditItemDTO {
  return {
    id: event.id,
    action: event.action,
    result: event.result,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    reason: event.reason,
    before: event.before,
    after: event.after,
    errorCode: event.errorCode,
    createdAt: event.createdAt.toISOString(),
    admin: {
      id: event.platformAdmin.id,
      name: event.platformAdmin.user.name,
      email: event.platformAdmin.user.email,
    },
    store: event.store,
  };
}

export async function queryAdminAuditEvents(input: unknown): Promise<AdminAuditListDTO> {
  const values = adminAuditListInputSchema.parse(input);
  const end = values.to ? new Date(`${values.to}T23:59:59.999Z`) : undefined;
  const where: Prisma.AdminAuditEventWhereInput = {
    ...(values.storeId ? { storeId: values.storeId } : {}),
    ...(values.adminId ? { platformAdminId: values.adminId } : {}),
    ...(values.action ? { action: values.action } : {}),
    ...(values.result ? { result: values.result } : {}),
    ...(values.from || end
      ? {
          createdAt: {
            ...(values.from ? { gte: new Date(`${values.from}T00:00:00.000Z`) } : {}),
            ...(end ? { lte: end } : {}),
          },
        }
      : {}),
  };
  const [total, events, admins] = await db.$transaction([
    db.adminAuditEvent.count({ where }),
    db.adminAuditEvent.findMany({
      where,
      select,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (values.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.platformAdmin.findMany({
      where: { auditEvents: { some: {} } },
      select: { id: true, user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return {
    items: events.map(serializeAdminAuditEvent),
    admins: admins.map((admin) => ({ id: admin.id, ...admin.user })),
    page: values.page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listAdminAuditEvents(input: unknown): Promise<AdminAuditListDTO> {
  await requirePlatformAdmin();

  return queryAdminAuditEvents(input);
}
