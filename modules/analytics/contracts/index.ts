import { z } from "zod";
export const metricEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(["STORE_VIEW", "PRODUCT_VIEW"]),
  productId: z.string().uuid().optional(),
});
export const likeSchema = z.object({ liked: z.boolean() });
export type MetricsDTO = {
  impressions: number;
  totalLikes: number;
  productViews: number;
  productCount: number;
  mostViewed: { id: string; name: string; count: number }[];
  mostLiked: { id: string; name: string; count: number }[];
};
