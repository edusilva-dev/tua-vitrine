import { z } from "zod";

export const metricEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(["STORE_VIEW", "PRODUCT_VIEW"]),
  productId: z.string().uuid().optional(),
});

export const likeSchema = z.object({ liked: z.boolean() });

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data válida no formato AAAA-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Use uma data válida.");

export const metricsQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine((value) => Boolean(value.from) === Boolean(value.to), {
    message: "Informe o início e o fim do período.",
  });

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;

export type MetricsDTO = {
  impressions: number;
  totalLikes: number;
  productViews: number;
  productCount: number;
  mostViewed: { id: string; name: string; count: number }[];
  mostLiked: { id: string; name: string; count: number }[];
  period: {
    from: string;
    to: string;
    availableFrom: string | null;
    availableTo: string;
    interval: "DAY" | "MONTH";
    metricsHistoryDays: number | null;
  };
  timeline: {
    key: string;
    label: string;
    impressions: number;
    productViews: number;
  }[];
};
