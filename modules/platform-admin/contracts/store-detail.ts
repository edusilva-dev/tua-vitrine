import type { BillingPlan, Entitlements } from "@/modules/billing/contracts";

export type PlatformStoreDetailDTO = {
  id: string;
  name: string;
  slug: string;
  publicUrl: string;
  status: "DRAFT" | "ACTIVE";
  createdAt: string;
  updatedAt: string;
  onboardingCompletedAt: string | null;
  trialStartedAt: string | null;
  members: Array<{
    userId: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: string;
    joinedAt: string;
  }>;
  products: {
    published: number;
    unpublished: number;
    archived: number;
    total: number;
  };
  plan: Pick<
    Entitlements,
    "plan" | "source" | "trialEndsAt" | "trialDaysRemaining" | "trialAvailable"
  >;
  subscription: {
    id: string;
    plan: BillingPlan | null;
    status:
      | "INCOMPLETE"
      | "INCOMPLETE_EXPIRED"
      | "TRIALING"
      | "ACTIVE"
      | "PAST_DUE"
      | "CANCELED"
      | "UNPAID"
      | "PAUSED"
      | null;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    trialUsedAt: string | null;
    cancelAtPeriodEnd: boolean;
    updatedAt: string;
  } | null;
};
