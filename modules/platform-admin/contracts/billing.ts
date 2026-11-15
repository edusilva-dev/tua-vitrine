import { z } from "zod";

export const reconcilePlatformBillingSchema = z.object({
  reason: z.string().trim().min(10, "Explique o motivo com pelo menos 10 caracteres.").max(500),
});

export type ReconcilePlatformBillingInput = z.infer<typeof reconcilePlatformBillingSchema>;
