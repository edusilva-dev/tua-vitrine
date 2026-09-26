ALTER TABLE "Store"
ADD COLUMN "catalogGrouping" TEXT NOT NULL DEFAULT 'continuous';

ALTER TABLE "Category"
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ordered_categories AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY "name", "id") - 1 AS "nextPosition"
  FROM "Category"
)
UPDATE "Category"
SET "position" = ordered_categories."nextPosition"
FROM ordered_categories
WHERE "Category"."id" = ordered_categories."id";

CREATE INDEX "Category_storeId_position_idx" ON "Category"("storeId", "position");
