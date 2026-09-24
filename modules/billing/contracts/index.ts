import { z } from "zod";

export const billingPlanSchema = z.enum(["BASIC", "PRO"]);

export type BillingPlan = z.infer<typeof billingPlanSchema>;

export const billingPlans = {
  BASIC: { name: "Basic", amountCents: 1900, currency: "BRL" },
  PRO: { name: "Pro", amountCents: 3900, currency: "BRL" },
} as const satisfies Record<BillingPlan, { name: string; amountCents: number; currency: "BRL" }>;
