import { z } from "zod";

const ratingSchema = z.number().int().min(1, "Escolha uma nota.").max(5, "Escolha uma nota.");
const messageSchema = z
  .string()
  .trim()
  .max(2000, "Use no máximo 2.000 caracteres.")
  .optional()
  .transform((value) => value || undefined);

export const platformFeedbackSchema = z.object({
  kind: z.enum(["SUGGESTION", "ISSUE", "PRAISE"]),
  rating: ratingSchema,
  message: messageSchema.refine(
    (value) => !value || value.length >= 10,
    "Conte um pouco mais em pelo menos 10 caracteres."
  ),
  context: z.string().trim().min(1).max(200).default("/admin/support"),
});

export const storefrontFeedbackSchema = z.object({
  kind: z.enum(["FOUND", "NOT_FOUND", "PROBLEM"]),
  rating: ratingSchema,
  message: z
    .string()
    .trim()
    .max(500, "Use no máximo 500 caracteres.")
    .optional()
    .transform((value) => value || undefined),
  context: z.enum(["GENERAL", "SEARCH_EMPTY"]),
});

export type PlatformFeedbackInput = z.infer<typeof platformFeedbackSchema>;

export type StorefrontFeedbackInput = z.infer<typeof storefrontFeedbackSchema>;

export type StorefrontFeedbackSummaryDTO = {
  total: number;
  averageRating: number | null;
  found: number;
  notFound: number;
  problems: number;
  recent: {
    id: string;
    kind: StorefrontFeedbackInput["kind"];
    rating: number;
    message: string;
    context: StorefrontFeedbackInput["context"];
    createdAt: string;
  }[];
};

export const platformFeedbackKindLabels = {
  SUGGESTION: "Sugestão",
  ISSUE: "Algo me atrapalhou",
  PRAISE: "Elogio",
} as const satisfies Record<PlatformFeedbackInput["kind"], string>;

export const storefrontFeedbackKindLabels = {
  FOUND: "Encontrei o que procurava",
  NOT_FOUND: "Não encontrei o que procurava",
  PROBLEM: "Tive um problema",
} as const satisfies Record<StorefrontFeedbackInput["kind"], string>;
