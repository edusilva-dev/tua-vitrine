import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import {
  type SupportDetailDTO,
  type SupportListDTO,
  supportListInputSchema,
  supportUpdateSchema,
} from "../contracts/support";
import { requirePlatformAdmin } from "./access";
import { writeAdminAuditEvent } from "./audit";

const PAGE_SIZE = 20;
const select = {
  id: true,
  subject: true,
  category: true,
  status: true,
  notificationStatus: true,
  requesterName: true,
  replyEmail: true,
  createdAt: true,
  store: { select: { id: true, name: true, slug: true } },
} as const;

type SupportListRecord = Prisma.SupportRequestGetPayload<{ select: typeof select }>;
const serialize = (item: SupportListRecord) => ({
  ...item,
  createdAt: item.createdAt.toISOString(),
});

export async function listSupportRequests(input: unknown): Promise<SupportListDTO> {
  await requirePlatformAdmin();
  const values = supportListInputSchema.parse(input);
  const where: Prisma.SupportRequestWhereInput = {
    ...(values.status ? { status: values.status } : {}),
    ...(values.category ? { category: values.category } : {}),
    ...(values.storeId ? { storeId: values.storeId } : {}),
    ...(values.period
      ? { createdAt: { gte: new Date(Date.now() - values.period * 24 * 60 * 60 * 1000) } }
      : {}),
    ...(values.q
      ? {
          OR: [
            { subject: { contains: values.q, mode: "insensitive" } },
            { requesterName: { contains: values.q, mode: "insensitive" } },
            { replyEmail: { contains: values.q, mode: "insensitive" } },
            { store: { name: { contains: values.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, items] = await db.$transaction([
    db.supportRequest.count({ where }),
    db.supportRequest.findMany({
      where,
      select,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (values.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    items: items.map(serialize),
    page: values.page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getSupportRequest(id: string): Promise<SupportDetailDTO | null> {
  await requirePlatformAdmin();

  if (!z.string().uuid().safeParse(id).success) return null;

  const item = await db.supportRequest.findUnique({
    where: { id },
    select: {
      ...select,
      message: true,
      internalNote: true,
      updatedAt: true,
      resolvedAt: true,
      notificationAttemptedAt: true,
    },
  });

  return item
    ? {
        ...serialize(item),
        message: item.message,
        internalNote: item.internalNote,
        updatedAt: item.updatedAt.toISOString(),
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
        notificationAttemptedAt: item.notificationAttemptedAt?.toISOString() ?? null,
      }
    : null;
}

export async function updateSupportRequest(id: string, input: unknown): Promise<void> {
  const admin = await requirePlatformAdmin(true);
  const values = supportUpdateSchema.parse(input);

  if (!z.string().uuid().safeParse(id).success)
    throw new AppError(404, "NOT_FOUND", "Solicitação não encontrada.");

  const before = await db.supportRequest.findUnique({
    where: { id },
    select: { id: true, storeId: true, status: true, internalNote: true },
  });

  if (!before) throw new AppError(404, "NOT_FOUND", "Solicitação não encontrada.");

  const after = await db.supportRequest.update({
    where: { id },
    data: {
      status: values.status,
      internalNote: values.internalNote || null,
      resolvedAt: values.status === "RESOLVED" ? new Date() : null,
    },
    select: { status: true, internalNote: true },
  });

  await writeAdminAuditEvent({
    platformAdminId: admin.grantId,
    storeId: before.storeId,
    action: "SUPPORT_UPDATE",
    result: "SUCCESS",
    resourceType: "SupportRequest",
    resourceId: id,
    reason: values.reason,
    before: { status: before.status, hasInternalNote: Boolean(before.internalNote) },
    after: { status: after.status, hasInternalNote: Boolean(after.internalNote) },
  });
}
