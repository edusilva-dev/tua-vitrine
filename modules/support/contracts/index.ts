import { z } from "zod";

export const supportCategorySchema = z.enum(["QUESTION", "BILLING", "TECHNICAL", "FEEDBACK"]);

export const supportRequestSchema = z.object({
  category: supportCategorySchema,
  subject: z
    .string()
    .trim()
    .min(4, "Resuma o assunto em pelo menos 4 caracteres.")
    .max(100, "Use no máximo 100 caracteres.")
    .refine((value) => !/[\r\n]/.test(value), "Use uma única linha."),
  message: z
    .string()
    .trim()
    .min(20, "Conte um pouco mais para conseguirmos ajudar.")
    .max(3000, "Use no máximo 3.000 caracteres."),
});

export type SupportRequest = z.infer<typeof supportRequestSchema>;

export const supportCategoryLabels = {
  QUESTION: "Dúvida sobre o sistema",
  BILLING: "Plano e cobrança",
  TECHNICAL: "Problema técnico",
  FEEDBACK: "Sugestão ou feedback",
} as const satisfies Record<SupportRequest["category"], string>;
