import type { BillingPlan, Entitlements } from "@/modules/billing/contracts";
import type { AdminAuditAction, AdminAuditResult } from "./audit";

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
  trialEndedAt: string | null;
  adminBlockedAt: string | null;
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
    customerDashboardUrl: string;
    subscriptionDashboardUrl: string | null;
  } | null;
  lastStripeWebhook: { id: string; type: string; processedAt: string } | null;
  manualPlanGrant: {
    id: string;
    plan: "ESSENTIAL" | "PROFESSIONAL";
    expiresAt: string;
    reason: string;
  } | null;
  recentSupportRequests: Array<{
    id: string;
    subject: string;
    status: "NEW" | "IN_PROGRESS" | "RESOLVED";
    createdAt: string;
  }>;
  recentAuditEvents: Array<{
    id: string;
    action: AdminAuditAction;
    result: AdminAuditResult;
    reason: string;
    createdAt: string;
    adminName: string;
  }>;
};
