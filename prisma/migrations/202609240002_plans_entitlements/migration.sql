-- Rename paid plans without losing existing subscriptions, then add the free tier.
ALTER TYPE "BillingPlan" RENAME VALUE 'BASIC' TO 'ESSENTIAL';
ALTER TYPE "BillingPlan" RENAME VALUE 'PRO' TO 'PROFESSIONAL';
ALTER TYPE "BillingPlan" ADD VALUE 'FREE';

ALTER TABLE "Product" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "StoreMember" GROUP BY "userId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Cannot enforce one store per user: duplicate StoreMember.userId values exist';
  END IF;
END $$;
DROP INDEX IF EXISTS "StoreMember_userId_createdAt_idx";
CREATE UNIQUE INDEX "StoreMember_userId_key" ON "StoreMember"("userId");

CREATE TABLE "PromotionCampaign" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT NOT NULL, "ctaLabel" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false, "bannerAssetId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionCampaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromotionCampaign_storeId_key" ON "PromotionCampaign"("storeId");
CREATE UNIQUE INDEX "PromotionCampaign_storeId_id_key" ON "PromotionCampaign"("storeId", "id");
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_storeId_bannerAssetId_fkey" FOREIGN KEY ("storeId", "bannerAssetId") REFERENCES "Asset"("storeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PromotionCampaignProduct" (
  "storeId" UUID NOT NULL, "campaignId" UUID NOT NULL, "productId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PromotionCampaignProduct_pkey" PRIMARY KEY ("campaignId", "productId")
);
CREATE INDEX "PromotionCampaignProduct_storeId_position_idx" ON "PromotionCampaignProduct"("storeId", "position");
ALTER TABLE "PromotionCampaignProduct" ADD CONSTRAINT "PromotionCampaignProduct_storeId_campaignId_fkey" FOREIGN KEY ("storeId", "campaignId") REFERENCES "PromotionCampaign"("storeId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionCampaignProduct" ADD CONSTRAINT "PromotionCampaignProduct_storeId_productId_fkey" FOREIGN KEY ("storeId", "productId") REFERENCES "Product"("storeId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
