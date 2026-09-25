import "server-only";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import { assetUrl } from "@/lib/server/storage-adapter";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import {
  type AdminPromotionCampaignDTO,
  type PromotionProductChoice,
  type PublicPromotionCampaignDTO,
  promotionCampaignInputSchema,
} from "../contracts";

const campaignInclude = {
  products: { orderBy: { position: "asc" as const }, select: { productId: true, position: true } },
  bannerAsset: { select: { id: true, storageKey: true } },
};

export async function getPromotionCampaign(
  context: StoreContext
): Promise<AdminPromotionCampaignDTO | null> {
  const campaign = await db.promotionCampaign.findUnique({
    where: { storeId: context.storeId },
    include: campaignInclude,
  });

  if (!campaign) return null;

  return {
    title: campaign.title,
    description: campaign.description,
    ctaLabel: campaign.ctaLabel,
    active: campaign.active,
    banner: campaign.bannerAsset
      ? { id: campaign.bannerAsset.id, url: assetUrl(campaign.bannerAsset) }
      : null,
    productIds: campaign.products.map((item) => item.productId),
  };
}

export function listPromotionProductChoices(
  context: StoreContext
): Promise<PromotionProductChoice[]> {
  return db.product.findMany({
    where: { storeId: context.storeId, archivedAt: null, published: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 1000,
  });
}

export async function savePromotionCampaign(context: StoreContext, input: unknown) {
  const entitlements = await getEntitlements(context);

  if (!entitlements.canUsePromotionCampaign) {
    throw new AppError(
      403,
      "PLAN_REQUIRED",
      "A campanha promocional está disponível no plano Profissional."
    );
  }

  const values = promotionCampaignInputSchema.parse(input);
  const [productCount, assetCount] = await Promise.all([
    db.product.count({
      where: {
        storeId: context.storeId,
        id: { in: values.productIds },
        archivedAt: null,
        published: true,
      },
    }),
    values.bannerAssetId
      ? db.asset.count({ where: { storeId: context.storeId, id: values.bannerAssetId } })
      : Promise.resolve(1),
  ]);

  if (productCount !== values.productIds.length || assetCount !== 1) {
    throw new AppError(404, "NOT_FOUND", "Produto ou imagem da campanha não encontrado.");
  }

  return db.$transaction(async (tx) => {
    const campaign = await tx.promotionCampaign.upsert({
      where: { storeId: context.storeId },
      create: {
        storeId: context.storeId,
        title: values.title,
        description: values.description,
        ctaLabel: values.ctaLabel,
        active: values.active,
        bannerAssetId: values.bannerAssetId,
      },
      update: {
        title: values.title,
        description: values.description,
        ctaLabel: values.ctaLabel,
        active: values.active,
        bannerAssetId: values.bannerAssetId,
      },
    });

    await tx.promotionCampaignProduct.deleteMany({
      where: { storeId: context.storeId, campaignId: campaign.id },
    });

    if (values.productIds.length) {
      await tx.promotionCampaignProduct.createMany({
        data: values.productIds.map((productId, position) => ({
          storeId: context.storeId,
          campaignId: campaign.id,
          productId,
          position,
        })),
      });
    }

    return tx.promotionCampaign.findUniqueOrThrow({
      where: { storeId: context.storeId },
      include: campaignInclude,
    });
  });
}

export async function getPublicPromotionCampaign(
  context: StoreContext
): Promise<PublicPromotionCampaignDTO | null> {
  const entitlements = await getEntitlements(context);

  if (!entitlements.canUsePromotionCampaign) return null;

  const campaign = await db.promotionCampaign.findFirst({
    where: { storeId: context.storeId, active: true },
    include: {
      bannerAsset: true,
      products: {
        where: { product: { archivedAt: null, published: true } },
        orderBy: { position: "asc" },
        select: { productId: true },
      },
    },
  });

  if (!campaign) return null;

  return {
    title: campaign.title,
    description: campaign.description,
    ctaLabel: campaign.ctaLabel,
    bannerUrl: campaign.bannerAsset ? assetUrl(campaign.bannerAsset) : null,
    productIds: campaign.products.map((item) => item.productId),
  };
}
