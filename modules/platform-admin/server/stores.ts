import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import { resolveEntitlements } from "@/modules/billing/server/entitlements";
import { type PlatformStoreListDTO, platformStoreListInputSchema } from "../contracts/stores";
import { requirePlatformAdmin } from "./access";

const PAGE_SIZE = 20;
const ACTIVE_PAID_STATUSES = ["ACTIVE", "TRIALING"] as const;
const PAID_PLANS = ["ESSENTIAL", "PROFESSIONAL"] as const;

function activePaidWhere(plan?: "ESSENTIAL" | "PROFESSIONAL"): Prisma.StoreWhereInput {
  return {
    subscription: {
      is: {
        status: { in: [...ACTIVE_PAID_STATUSES] },
        plan: plan ?? { in: [...PAID_PLANS] },
      },
    },
  };
}

function internalTrialWhere(now: Date): Prisma.StoreWhereInput {
  const startedAfter = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  return {
    AND: [
      { NOT: activePaidWhere() },
      { trialEndedAt: null },
      { trialStartedAt: { gt: startedAfter, lte: now } },
      {
        OR: [{ subscription: { is: null } }, { subscription: { is: { trialUsedAt: null } } }],
      },
    ],
  };
}

function manualGrantWhere(now: Date, plan?: "ESSENTIAL" | "PROFESSIONAL"): Prisma.StoreWhereInput {
  return {
    manualPlanGrant: {
      is: { expiresAt: { gt: now }, plan: plan ?? { in: [...PAID_PLANS] } },
    },
  };
}

function effectivePlanWhere(
  plan: "FREE" | "ESSENTIAL" | "PROFESSIONAL",
  now: Date
): Prisma.StoreWhereInput {
  if (plan === "ESSENTIAL") {
    return {
      OR: [
        activePaidWhere("ESSENTIAL"),
        { AND: [manualGrantWhere(now, "ESSENTIAL"), { NOT: activePaidWhere("PROFESSIONAL") }] },
      ],
    };
  }

  if (plan === "PROFESSIONAL") {
    return {
      OR: [
        activePaidWhere("PROFESSIONAL"),
        internalTrialWhere(now),
        manualGrantWhere(now, "PROFESSIONAL"),
      ],
    };
  }

  const startedAfter = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  return {
    AND: [
      { NOT: activePaidWhere() },
      { NOT: manualGrantWhere(now) },
      {
        OR: [
          { trialStartedAt: null },
          { trialStartedAt: { lte: startedAfter } },
          { trialStartedAt: { gt: now } },
          { trialEndedAt: { not: null } },
          { subscription: { is: { trialUsedAt: { not: null } } } },
        ],
      },
    ],
  };
}

function searchWhere(query: string): Prisma.StoreWhereInput | null {
  if (!query) return null;

  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const normalized = query.toLowerCase();

  return {
    OR: [
      ...(uuid.test(query) ? [{ id: query }] : []),
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: normalized, mode: "insensitive" } },
      {
        members: {
          some: { role: "OWNER", user: { email: { contains: normalized, mode: "insensitive" } } },
        },
      },
      { subscription: { is: { stripeCustomerId: query } } },
      { subscription: { is: { stripeSubscriptionId: query } } },
    ],
  };
}

export function platformStoreWhere(
  input: ReturnType<typeof platformStoreListInputSchema.parse>,
  now = new Date()
): Prisma.StoreWhereInput {
  const conditions: Prisma.StoreWhereInput[] = [];
  const search = searchWhere(input.q);

  if (search) conditions.push(search);

  if (input.status) conditions.push({ status: input.status });

  if (input.plan) conditions.push(effectivePlanWhere(input.plan, now));

  if (input.subscription === "NONE") conditions.push({ subscription: { is: null } });

  if (input.subscription && input.subscription !== "NONE") {
    conditions.push({ subscription: { is: { status: input.subscription } } });
  }

  return conditions.length ? { AND: conditions } : {};
}

export async function queryPlatformStores(
  input: unknown,
  now = new Date()
): Promise<PlatformStoreListDTO> {
  const values = platformStoreListInputSchema.parse(input);
  const where = platformStoreWhere(values, now);
  const skip = (values.page - 1) * PAGE_SIZE;
  const [total, stores] = await db.$transaction([
    db.store.count({ where }),
    db.store.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        onboardingCompletedAt: true,
        trialStartedAt: true,
        trialEndedAt: true,
        adminBlockedAt: true,
        members: {
          where: { role: "OWNER" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { user: { select: { name: true, email: true } } },
        },
        subscription: { select: { plan: true, status: true, trialUsedAt: true } },
        manualPlanGrant: { select: { plan: true, expiresAt: true } },
        _count: { select: { products: { where: { archivedAt: null, published: true } } } },
      },
    }),
  ]);

  return {
    items: stores.map((store) => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      owner: store.members[0]?.user ?? null,
      plan: resolveEntitlements(
        {
          onboardingCompletedAt: store.onboardingCompletedAt,
          trialStartedAt: store.trialStartedAt,
          trialEndedAt: store.trialEndedAt,
          subscriptionPlan: store.subscription?.plan ?? null,
          subscriptionStatus: store.subscription?.status ?? null,
          trialUsedAt: store.subscription?.trialUsedAt ?? null,
          publishedProducts: store._count.products,
          manualGrantPlan: store.manualPlanGrant?.plan ?? null,
          manualGrantExpiresAt: store.manualPlanGrant?.expiresAt ?? null,
        },
        now
      ).plan,
      status: store.status,
      adminBlocked: Boolean(store.adminBlockedAt),
      subscriptionStatus: store.subscription?.status ?? null,
      createdAt: store.createdAt.toISOString(),
    })),
    page: values.page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listPlatformStores(input: unknown): Promise<PlatformStoreListDTO> {
  await requirePlatformAdmin();

  return queryPlatformStores(input);
}
