-- AlterTable
ALTER TABLE "Category" ADD COLUMN "slug" TEXT;
UPDATE "Category" SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')) || '-' || left("id"::text, 8);
ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;


-- CreateTable
CREATE TABLE "ProductOption" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionValue" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOptionValue" (
    "storeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "valueId" UUID NOT NULL,

    CONSTRAINT "VariantOptionValue_pkey" PRIMARY KEY ("variantId","optionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_storeId_productId_id_key" ON "ProductOption"("storeId", "productId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_name_key" ON "ProductOption"("productId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionValue_storeId_productId_optionId_id_key" ON "ProductOptionValue"("storeId", "productId", "optionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionValue_optionId_value_key" ON "ProductOptionValue"("optionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Category_storeId_slug_key" ON "Category"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_storeId_productId_id_key" ON "ProductVariant"("storeId", "productId", "id");

-- AddForeignKey
ALTER TABLE "Idempotency" ADD CONSTRAINT "Idempotency_storeId_productId_fkey" FOREIGN KEY ("storeId", "productId") REFERENCES "Product"("storeId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_storeId_productId_fkey" FOREIGN KEY ("storeId", "productId") REFERENCES "Product"("storeId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_storeId_productId_optionId_fkey" FOREIGN KEY ("storeId", "productId", "optionId") REFERENCES "ProductOption"("storeId", "productId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_storeId_productId_variantId_fkey" FOREIGN KEY ("storeId", "productId", "variantId") REFERENCES "ProductVariant"("storeId", "productId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_storeId_productId_optionId_valueId_fkey" FOREIGN KEY ("storeId", "productId", "optionId", "valueId") REFERENCES "ProductOptionValue"("storeId", "productId", "optionId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve variant option data while normalizing the existing JSON field.
INSERT INTO "ProductOption" ("id", "storeId", "productId", "name")
SELECT gen_random_uuid(), source."storeId", source."productId", source.key
FROM (SELECT DISTINCT pv."storeId", pv."productId", entry.key FROM "ProductVariant" pv CROSS JOIN LATERAL jsonb_each_text(pv."options") entry) source;
INSERT INTO "ProductOptionValue" ("id", "storeId", "productId", "optionId", "value")
SELECT gen_random_uuid(), source."storeId", source."productId", source."optionId", source.value
FROM (SELECT DISTINCT pv."storeId", pv."productId", po."id" AS "optionId", entry.value FROM "ProductVariant" pv CROSS JOIN LATERAL jsonb_each_text(pv."options") entry JOIN "ProductOption" po ON po."productId" = pv."productId" AND po."name" = entry.key) source;
INSERT INTO "VariantOptionValue" ("storeId", "productId", "variantId", "optionId", "valueId")
SELECT pv."storeId", pv."productId", pv."id", po."id", pov."id" FROM "ProductVariant" pv CROSS JOIN LATERAL jsonb_each_text(pv."options") entry JOIN "ProductOption" po ON po."productId" = pv."productId" AND po."name" = entry.key JOIN "ProductOptionValue" pov ON pov."optionId" = po."id" AND pov."value" = entry.value;
ALTER TABLE "ProductVariant" DROP COLUMN "options";
