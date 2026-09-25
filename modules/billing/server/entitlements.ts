import "server-only";
import type {
  BillingPlan as DatabaseBillingPlan,
  SubscriptionStatus,
} from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { type BillingPlan, type Entitlements, PLAN_CAPABILITIES } from "../contracts";

export const INTERNAL_TRIAL_DAYS = 14;

const ACTIVE_PAID_STATUSES = new Set<SubscriptionStatus>(["ACTIVE", "TRIALING"]);

type EntitlementState = {
  activatedAt: Date | null;
  subscriptionPlan: DatabaseBillingPlan | null;
  subscriptionStatus: SubscriptionStatus | null;
  publishedProducts: number;
  catalogProducts?: number;
};

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

export function resolveEntitlements(state: EntitlementState, now = new Date()): Entitlements {
  let plan: BillingPlan = "FREE";
  let source: Entitlements["source"] = "FREE";
  let trialEndsAt: Date | null = null;

  if (
    state.subscriptionPlan &&
    state.subscriptionPlan !== "FREE" &&
    state.subscriptionStatus &&
    ACTIVE_PAID_STATUSES.has(state.subscriptionStatus)
  ) {
    plan = state.subscriptionPlan;
    source = "SUBSCRIPTION";
  } else if (state.activatedAt) {
    const end = addDays(state.activatedAt, INTERNAL_TRIAL_DAYS);

    if (end.getTime() > now.getTime()) {
      plan = "PROFESSIONAL";
      source = "INTERNAL_TRIAL";
      trialEndsAt = end;
    }
  }

  const capabilities = PLAN_CAPABILITIES[plan];
  const millisecondsRemaining = trialEndsAt
    ? Math.max(0, trialEndsAt.getTime() - now.getTime())
    : 0;

  return {
    plan,
    source,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    trialDaysRemaining: Math.ceil(millisecondsRemaining / (24 * 60 * 60 * 1000)),
    publishedProducts: state.publishedProducts,
    catalogProducts: state.catalogProducts ?? state.publishedProducts,
    needsProductSelection: state.publishedProducts > capabilities.productLimit,
    ...capabilities,
  };
}

export async function getEntitlements(context: StoreContext): Promise<Entitlements> {
  const [store, catalogProducts] = await Promise.all([
    db.store.findUniqueOrThrow({
      where: { id: context.storeId },
      select: {
        onboardingCompletedAt: true,
        subscription: { select: { plan: true, status: true } },
        _count: {
          select: { products: { where: { archivedAt: null, published: true } } },
        },
      },
    }),
    db.product.count({ where: { storeId: context.storeId, archivedAt: null } }),
  ]);

  return resolveEntitlements({
    activatedAt: store.onboardingCompletedAt,
    subscriptionPlan: store.subscription?.plan ?? null,
    subscriptionStatus: store.subscription?.status ?? null,
    publishedProducts: store._count.products,
    catalogProducts,
  });
}
