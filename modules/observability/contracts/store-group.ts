import { z } from "zod";
import type { BillingPlan } from "@/modules/billing/contracts";
import { billingPlanSchema } from "@/modules/billing/contracts";
import type { StoreDTO } from "@/modules/stores/contracts";

export const analyticsStoreGroupSchema = z.strictObject({
  storeId: z.string().uuid(),
  plan: billingPlanSchema,
  status: z.enum(["DRAFT", "ACTIVE"]),
  onboarding_step: z.number().int().min(1).max(4),
});

export interface AnalyticsStoreGroup extends z.infer<typeof analyticsStoreGroupSchema> {}

export function toAnalyticsStoreGroup(
  store: Pick<StoreDTO, "id" | "status" | "onboardingStep">,
  plan: BillingPlan
): AnalyticsStoreGroup {
  return {
    storeId: store.id,
    plan,
    status: store.status,
    onboarding_step: store.onboardingStep,
  };
}
