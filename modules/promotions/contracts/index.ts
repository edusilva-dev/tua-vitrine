import { z } from "zod";

export const promotionCampaignInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180),
  ctaLabel: z.string().trim().min(1).max(30),
  active: z.boolean(),
  bannerAssetId: z.string().uuid().nullable(),
  productIds: z
    .array(z.string().uuid())
    .max(1000)
    .transform((ids) => [...new Set(ids)]),
});

export type PromotionCampaignInput = z.infer<typeof promotionCampaignInputSchema>;

export type PublicPromotionCampaignDTO = {
  title: string;
  description: string;
  ctaLabel: string;
  bannerUrl: string | null;
  productIds: string[];
};

export type AdminPromotionCampaignDTO = {
  title: string;
  description: string;
  ctaLabel: string;
  active: boolean;
  banner: { id: string; url: string } | null;
  productIds: string[];
};

export type PromotionProductChoice = { id: string; name: string };
