import { z } from "zod";
import { supportCategorySchema } from "@/modules/support/contracts";

export const supportStatusSchema = z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]);

export const supportListInputSchema = z.object({
  q: z.string().trim().max(100).default(""),
  status: supportStatusSchema.optional(),
  category: supportCategorySchema.optional(),
  storeId: z.string().uuid().optional(),
  period: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const supportUpdateSchema = z.object({
  status: supportStatusSchema,
  internalNote: z.string().trim().max(1000).nullable(),
});

export type SupportStatus = z.infer<typeof supportStatusSchema>;

export type SupportListInput = z.infer<typeof supportListInputSchema>;

export type SupportListItem = {
  id: string;
  subject: string;
  category: "QUESTION" | "BILLING" | "TECHNICAL" | "FEEDBACK";
  status: SupportStatus;
  notificationStatus: "PENDING" | "SENT" | "FAILED";
  requesterName: string;
  replyEmail: string;
  createdAt: string;
  store: { id: string; name: string; slug: string };
};

export type SupportListDTO = {
  items: SupportListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SupportDetailDTO = SupportListItem & {
  message: string;
  internalNote: string | null;
  updatedAt: string;
  resolvedAt: string | null;
  notificationAttemptedAt: string | null;
};
