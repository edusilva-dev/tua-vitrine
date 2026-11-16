import "server-only";
import { z } from "zod";
import type { AdminAuditAction, Prisma } from "@/generated/prisma/client";
import { getAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import { resolveEntitlements } from "@/modules/billing/server/entitlements";
import { confirmedActionSchema, manualPlanGrantSchema } from "../contracts/actions";
import { requirePlatformAdmin } from "./access";
import { writeAdminAuditEvent } from "./audit";

type AuthorizeAction = () => Promise<{ grantId: string }>;
const authorizeAction: AuthorizeAction = () => requirePlatformAdmin(true);

function storeId(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  return id;
}

async function audit(input: {
  adminId: string;
  storeId: string;
  action: AdminAuditAction;
  resourceType: string;
  resourceId: string;
  reason: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}) {
  await writeAdminAuditEvent({
    platformAdminId: input.adminId,
    storeId: input.storeId,
    action: input.action,
    result: "SUCCESS",
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    reason: input.reason,
    ...(input.before === undefined ? {} : { before: input.before }),
    ...(input.after === undefined ? {} : { after: input.after }),
  });
}

async function rejectAction(input: {
  adminId: string;
  storeId: string;
  action: AdminAuditAction;
  resourceType: string;
  resourceId: string;
  reason: string;
  error: AppError;
}): Promise<never> {
  await writeAdminAuditEvent({
    platformAdminId: input.adminId,
    storeId: input.storeId,
    action: input.action,
    result: "FAILURE",
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    reason: input.reason,
    errorCode: input.error.code,
  });

  throw input.error;
}

export async function setStoreBlocked(
  id: string,
  blocked: boolean,
  input: unknown,
  authorize: AuthorizeAction = authorizeAction
) {
  const admin = await authorize();
  const { reason } = confirmedActionSchema.parse(input);
  const store = await db.store.findUnique({
    where: { id: storeId(id) },
    select: { id: true, adminBlockedAt: true },
  });

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  if (Boolean(store.adminBlockedAt) === blocked)
    return rejectAction({
      adminId: admin.grantId,
      storeId: id,
      action: blocked ? "STORE_BLOCK" : "STORE_UNBLOCK",
      resourceType: "Store",
      resourceId: id,
      reason,
      error: new AppError(
        409,
        "NO_CHANGE",
        blocked ? "A loja já está bloqueada." : "A loja já está reativada."
      ),
    });

  const after = await db.store.update({
    where: { id },
    data: { adminBlockedAt: blocked ? new Date() : null },
    select: { adminBlockedAt: true },
  });

  await audit({
    adminId: admin.grantId,
    storeId: id,
    action: blocked ? "STORE_BLOCK" : "STORE_UNBLOCK",
    resourceType: "Store",
    resourceId: id,
    reason,
    before: { blocked: Boolean(store.adminBlockedAt) },
    after: { blocked: Boolean(after.adminBlockedAt) },
  });
}

export async function setStorePublished(
  id: string,
  published: boolean,
  input: unknown,
  authorize: AuthorizeAction = authorizeAction
) {
  const admin = await authorize();
  const { reason } = confirmedActionSchema.parse(input);
  const store = await db.store.findUnique({
    where: { id: storeId(id) },
    select: { id: true, status: true, onboardingCompletedAt: true },
  });

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  const status = published ? "ACTIVE" : "DRAFT";

  if (store.status === status)
    return rejectAction({
      adminId: admin.grantId,
      storeId: id,
      action: published ? "STOREFRONT_PUBLISH" : "STOREFRONT_UNPUBLISH",
      resourceType: "Store",
      resourceId: id,
      reason,
      error: new AppError(
        409,
        "NO_CHANGE",
        published ? "A vitrine já está publicada." : "A vitrine já está despublicada."
      ),
    });

  if (published && !store.onboardingCompletedAt)
    return rejectAction({
      adminId: admin.grantId,
      storeId: id,
      action: "STOREFRONT_PUBLISH",
      resourceType: "Store",
      resourceId: id,
      reason,
      error: new AppError(
        409,
        "ONBOARDING",
        "A loja precisa concluir o onboarding antes de ser publicada."
      ),
    });

  await db.store.update({ where: { id }, data: { status } });
  await audit({
    adminId: admin.grantId,
    storeId: id,
    action: published ? "STOREFRONT_PUBLISH" : "STOREFRONT_UNPUBLISH",
    resourceType: "Store",
    resourceId: id,
    reason,
    before: { status: store.status },
    after: { status },
  });
}

export async function endStoreTrial(
  id: string,
  input: unknown,
  now = new Date(),
  authorize: AuthorizeAction = authorizeAction
) {
  const admin = await authorize();
  const { reason } = confirmedActionSchema.parse(input);
  const store = await db.store.findUnique({
    where: { id: storeId(id) },
    select: {
      id: true,
      onboardingCompletedAt: true,
      trialStartedAt: true,
      trialEndedAt: true,
      subscription: { select: { plan: true, status: true, trialUsedAt: true } },
    },
  });

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  const access = resolveEntitlements(
    {
      onboardingCompletedAt: store.onboardingCompletedAt,
      trialStartedAt: store.trialStartedAt,
      trialEndedAt: store.trialEndedAt,
      subscriptionPlan: store.subscription?.plan ?? null,
      subscriptionStatus: store.subscription?.status ?? null,
      trialUsedAt: store.subscription?.trialUsedAt ?? null,
      publishedProducts: 0,
    },
    now
  );

  if (access.source !== "INTERNAL_TRIAL")
    return rejectAction({
      adminId: admin.grantId,
      storeId: id,
      action: "TRIAL_END",
      resourceType: "Store",
      resourceId: id,
      reason,
      error: new AppError(409, "TRIAL_INACTIVE", "A loja não possui um trial interno ativo."),
    });

  await db.store.update({ where: { id }, data: { trialEndedAt: now } });
  await audit({
    adminId: admin.grantId,
    storeId: id,
    action: "TRIAL_END",
    resourceType: "Store",
    resourceId: id,
    reason,
    before: { trialEndedAt: null },
    after: { trialEndedAt: now.toISOString() },
  });
}

export async function grantManualPlan(
  id: string,
  input: unknown,
  authorize: AuthorizeAction = authorizeAction
) {
  const admin = await authorize();
  const values = manualPlanGrantSchema.parse(input);
  const store = await db.store.findUnique({
    where: { id: storeId(id) },
    select: { id: true, manualPlanGrant: { select: { plan: true, expiresAt: true } } },
  });

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  const grant = await db.manualPlanGrant.upsert({
    where: { storeId: id },
    create: {
      storeId: id,
      plan: values.plan,
      expiresAt: values.expiresAt,
      reason: values.reason,
      grantedById: admin.grantId,
    },
    update: {
      plan: values.plan,
      expiresAt: values.expiresAt,
      reason: values.reason,
      grantedById: admin.grantId,
    },
    select: { id: true, plan: true, expiresAt: true },
  });

  await audit({
    adminId: admin.grantId,
    storeId: id,
    action: "MANUAL_PLAN_GRANT",
    resourceType: "ManualPlanGrant",
    resourceId: grant.id,
    reason: values.reason,
    ...(store.manualPlanGrant
      ? {
          before: {
            plan: store.manualPlanGrant.plan,
            expiresAt: store.manualPlanGrant.expiresAt.toISOString(),
          },
        }
      : {}),
    after: { plan: grant.plan, expiresAt: grant.expiresAt.toISOString() },
  });
}

export async function resendOwnerVerification(id: string, input: unknown) {
  const admin = await requirePlatformAdmin(true);
  const { reason } = confirmedActionSchema.parse(input);
  const store = await db.store.findUnique({
    where: { id: storeId(id) },
    select: {
      id: true,
      members: {
        where: { role: "OWNER" },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { user: { select: { id: true, email: true, emailVerified: true } } },
      },
    },
  });

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  const owner = store.members[0]?.user;

  if (!owner) throw new AppError(409, "OWNER_MISSING", "A loja não possui proprietário.");

  if (owner.emailVerified)
    return rejectAction({
      adminId: admin.grantId,
      storeId: id,
      action: "EMAIL_VERIFICATION_RESEND",
      resourceType: "User",
      resourceId: owner.id,
      reason,
      error: new AppError(409, "EMAIL_VERIFIED", "O e-mail do proprietário já está verificado."),
    });

  try {
    await getAuth().api.sendVerificationEmail({
      body: { email: owner.email, callbackURL: "/admin" },
    });
  } catch {
    return rejectAction({
      adminId: admin.grantId,
      storeId: id,
      action: "EMAIL_VERIFICATION_RESEND",
      resourceType: "User",
      resourceId: owner.id,
      reason,
      error: new AppError(503, "EMAIL_DELIVERY_FAILED", "Não foi possível enviar a confirmação."),
    });
  }

  await audit({
    adminId: admin.grantId,
    storeId: id,
    action: "EMAIL_VERIFICATION_RESEND",
    resourceType: "User",
    resourceId: owner.id,
    reason,
    before: { emailVerified: false },
    after: { verificationEmailRequested: true },
  });
}
