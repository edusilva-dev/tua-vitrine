import "server-only";

import { z } from "zod";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import { reconcileStripeBillingForStore } from "@/modules/billing/server/service";
import { reconcilePlatformBillingSchema } from "../contracts/billing";
import { requirePlatformAdmin } from "./access";
import { writeAdminAuditEvent } from "./audit";

function errorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;

  return "REMOTE_ERROR";
}

export async function reconcilePlatformStoreBilling(storeId: string, input: unknown) {
  const identity = await requirePlatformAdmin(true);
  const { reason } = reconcilePlatformBillingSchema.parse(input);

  if (!z.string().uuid().safeParse(storeId).success)
    throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          stripeSubscriptionId: true,
          currentPeriodEnd: true,
          trialEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
  });

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  try {
    const result = await reconcileStripeBillingForStore(storeId);

    await writeAdminAuditEvent({
      platformAdminId: identity.grantId,
      storeId,
      action: "BILLING_RECONCILE",
      result: "SUCCESS",
      resourceType: "StoreSubscription",
      resourceId: store.subscription?.stripeSubscriptionId ?? storeId,
      reason,
      before: result.before,
      after: result.after,
    });

    return { changed: JSON.stringify(result.before) !== JSON.stringify(result.after), ...result };
  } catch (error) {
    await writeAdminAuditEvent({
      platformAdminId: identity.grantId,
      storeId,
      action: "BILLING_RECONCILE",
      result: "FAILURE",
      resourceType: "StoreSubscription",
      resourceId: store.subscription?.stripeSubscriptionId ?? storeId,
      reason,
      ...(store.subscription
        ? {
            before: {
              plan: store.subscription.plan,
              status: store.subscription.status,
              stripeSubscriptionId: store.subscription.stripeSubscriptionId,
              currentPeriodEnd: store.subscription.currentPeriodEnd?.toISOString() ?? null,
              trialEnd: store.subscription.trialEnd?.toISOString() ?? null,
              cancelAtPeriodEnd: store.subscription.cancelAtPeriodEnd,
            },
          }
        : {}),
      errorCode: errorCode(error),
    });

    throw error;
  }
}
