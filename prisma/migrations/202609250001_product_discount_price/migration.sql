ALTER TABLE "Product"
ADD COLUMN "discountPriceCents" INTEGER;

ALTER TABLE "ProductVariant"
ADD COLUMN "discountPriceCents" INTEGER;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_discount_price_valid"
CHECK ("discountPriceCents" IS NULL OR ("discountPriceCents" > 0 AND "discountPriceCents" < "priceCents"));

ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_discount_price_valid"
CHECK ("discountPriceCents" IS NULL OR ("discountPriceCents" > 0 AND "discountPriceCents" < "priceCents"));
