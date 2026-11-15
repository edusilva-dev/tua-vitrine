import "server-only";

import { z } from "zod";
import { db } from "@/lib/server/db";
import { resolveEntitlements } from "@/modules/billing/server/entitlements";
import type { PlatformStoreDetailDTO } from "../contracts/store-detail";
import { requirePlatformAdmin } from "./access";

export async function queryPlatformStoreDetail(
  storeId: string,
  now = new Date()
): Promise<PlatformStoreDetailDTO | null> {
  if (!z.string().uuid().safeParse(storeId).success) return null;

  const [store, published, unpublished, archivedProducts] = await db.$transaction([
    db.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        onboardingCompletedAt: true,
        trialStartedAt: true,
        members: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            userId: true,
            role: true,
            createdAt: true,
            user: { select: { name: true, email: true, emailVerified: true } },
          },
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            currentPeriodEnd: true,
            trialEnd: true,
            trialUsedAt: true,
            cancelAtPeriodEnd: true,
            updatedAt: true,
          },
        },
        stripeWebhookEvents: {
          orderBy: { processedAt: "desc" },
          take: 1,
          select: { id: true, type: true, processedAt: true },
        },
      },
    }),
    db.product.count({ where: { storeId, archivedAt: null, published: true } }),
    db.product.count({ where: { storeId, archivedAt: null, published: false } }),
    db.product.count({ where: { storeId, archivedAt: { not: null } } }),
  ]);

  if (!store) return null;

  const entitlements = resolveEntitlements(
    {
      onboardingCompletedAt: store.onboardingCompletedAt,
      trialStartedAt: store.trialStartedAt,
      subscriptionPlan: store.subscription?.plan ?? null,
      subscriptionStatus: store.subscription?.status ?? null,
      trialUsedAt: store.subscription?.trialUsedAt ?? null,
      publishedProducts: published,
      catalogProducts: published + unpublished,
    },
    now
  );
  const dashboardPrefix = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "https://dashboard.stripe.com"
    : "https://dashboard.stripe.com/test";

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    publicUrl: `/${store.slug}`,
    status: store.status,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
    onboardingCompletedAt: store.onboardingCompletedAt?.toISOString() ?? null,
    trialStartedAt: store.trialStartedAt?.toISOString() ?? null,
    members: store.members.map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
      ...member.user,
    })),
    products: {
      published,
      unpublished,
      archived: archivedProducts,
      total: published + unpublished + archivedProducts,
    },
    plan: {
      plan: entitlements.plan,
      source: entitlements.source,
      trialEndsAt: entitlements.trialEndsAt,
      trialDaysRemaining: entitlements.trialDaysRemaining,
      trialAvailable: entitlements.trialAvailable,
    },
    subscription: store.subscription
      ? {
          ...store.subscription,
          currentPeriodEnd: store.subscription.currentPeriodEnd?.toISOString() ?? null,
          trialEnd: store.subscription.trialEnd?.toISOString() ?? null,
          trialUsedAt: store.subscription.trialUsedAt?.toISOString() ?? null,
          updatedAt: store.subscription.updatedAt.toISOString(),
          customerDashboardUrl: `${dashboardPrefix}/customers/${store.subscription.stripeCustomerId}`,
          subscriptionDashboardUrl: store.subscription.stripeSubscriptionId
            ? `${dashboardPrefix}/subscriptions/${store.subscription.stripeSubscriptionId}`
            : null,
        }
      : null,
    lastStripeWebhook: store.stripeWebhookEvents[0]
      ? {
          ...store.stripeWebhookEvents[0],
          processedAt: store.stripeWebhookEvents[0].processedAt.toISOString(),
        }
      : null,
  };
}

export async function getPlatformStoreDetail(
  storeId: string
): Promise<PlatformStoreDetailDTO | null> {
  await requirePlatformAdmin();

  return queryPlatformStoreDetail(storeId);
}
