import { z } from "zod";

export const billingPlanSchema = z.enum(["FREE", "ESSENTIAL", "PROFESSIONAL"]);

export const paidBillingPlanSchema = z.enum(["ESSENTIAL", "PROFESSIONAL"]);

export type BillingPlan = z.infer<typeof billingPlanSchema>;

export type PaidBillingPlan = z.infer<typeof paidBillingPlanSchema>;

export const billingPlans = {
  FREE: { name: "Free", amountCents: 0, currency: "BRL" },
  ESSENTIAL: { name: "Essencial", amountCents: 1900, currency: "BRL" },
  PROFESSIONAL: { name: "Profissional", amountCents: 3900, currency: "BRL" },
} as const satisfies Record<BillingPlan, { name: string; amountCents: number; currency: "BRL" }>;

export const entitlementsSchema = z.object({
  plan: billingPlanSchema,
  source: z.enum(["FREE", "INTERNAL_TRIAL", "SUBSCRIPTION"]),
  trialEndsAt: z.string().datetime().nullable(),
  trialDaysRemaining: z.number().int().nonnegative(),
  productLimit: z.number().int().positive(),
  publishedProducts: z.number().int().nonnegative(),
  catalogProducts: z.number().int().nonnegative(),
  needsProductSelection: z.boolean(),
  metricsHistoryDays: z.number().int().positive().nullable(),
  canImportProducts: z.boolean(),
  canCustomizeColors: z.boolean(),
  canUseFullCustomization: z.boolean(),
  canUsePromotionCampaign: z.boolean(),
});

export type Entitlements = z.infer<typeof entitlementsSchema>;

export const PLAN_CAPABILITIES = {
  FREE: {
    productLimit: 10,
    metricsHistoryDays: 7,
    canImportProducts: false,
    canCustomizeColors: false,
    canUseFullCustomization: false,
    canUsePromotionCampaign: false,
  },
  ESSENTIAL: {
    productLimit: 50,
    metricsHistoryDays: null,
    canImportProducts: true,
    canCustomizeColors: true,
    canUseFullCustomization: false,
    canUsePromotionCampaign: false,
  },
  PROFESSIONAL: {
    productLimit: 1000,
    metricsHistoryDays: null,
    canImportProducts: true,
    canCustomizeColors: true,
    canUseFullCustomization: true,
    canUsePromotionCampaign: true,
  },
} as const satisfies Record<
  BillingPlan,
  {
    productLimit: number;
    metricsHistoryDays: number | null;
    canImportProducts: boolean;
    canCustomizeColors: boolean;
    canUseFullCustomization: boolean;
    canUsePromotionCampaign: boolean;
  }
>;
