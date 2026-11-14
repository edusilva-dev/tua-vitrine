import { z } from "zod";
import { billingPlanSchema } from "@/modules/billing/contracts";

export const platformStoreSubscriptionFilterSchema = z.enum([
  "NONE",
  "INCOMPLETE",
  "INCOMPLETE_EXPIRED",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "UNPAID",
  "PAUSED",
]);

export const platformStoreListInputSchema = z.object({
  q: z.string().trim().max(100).default(""),
  status: z.enum(["DRAFT", "ACTIVE"]).optional(),
  plan: billingPlanSchema.optional(),
  subscription: platformStoreSubscriptionFilterSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export type PlatformStoreListInput = z.infer<typeof platformStoreListInputSchema>;

export type PlatformStoreListItemDTO = {
  id: string;
  name: string;
  slug: string;
  owner: { name: string; email: string } | null;
  plan: "FREE" | "ESSENTIAL" | "PROFESSIONAL";
  status: "DRAFT" | "ACTIVE";
  subscriptionStatus:
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED"
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELED"
    | "UNPAID"
    | "PAUSED"
    | null;
  createdAt: string;
};

export type PlatformStoreListDTO = {
  items: PlatformStoreListItemDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
