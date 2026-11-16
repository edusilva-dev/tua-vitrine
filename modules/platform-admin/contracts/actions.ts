import { z } from "zod";
import { paidBillingPlanSchema } from "@/modules/billing/contracts";

export const operationalReasonSchema = z
  .string()
  .trim()
  .min(10, "Explique o motivo em pelo menos 10 caracteres.")
  .max(500);

export const confirmedActionSchema = z.object({
  reason: operationalReasonSchema,
  confirmed: z.literal(true),
});

export const manualPlanGrantSchema = confirmedActionSchema
  .extend({ plan: paidBillingPlanSchema, expiresAt: z.coerce.date() })
  .superRefine((value, ctx) => {
    const now = Date.now();

    if (value.expiresAt.getTime() <= now)
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "A expiração deve estar no futuro.",
      });

    if (value.expiresAt.getTime() > now + 366 * 24 * 60 * 60 * 1000)
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "A concessão pode durar no máximo um ano.",
      });
  });
