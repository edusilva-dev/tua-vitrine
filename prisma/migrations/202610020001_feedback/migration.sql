CREATE TYPE "FeedbackSource" AS ENUM ('PLATFORM', 'STOREFRONT');

CREATE TYPE "FeedbackKind" AS ENUM (
  'SUGGESTION',
  'ISSUE',
  'PRAISE',
  'FOUND',
  'NOT_FOUND',
  'PROBLEM'
);

CREATE TABLE "Feedback" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "sessionId" UUID,
  "userId" TEXT,
  "source" "FeedbackSource" NOT NULL,
  "kind" "FeedbackKind" NOT NULL,
  "rating" INTEGER NOT NULL,
  "message" TEXT,
  "context" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Feedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE INDEX "Feedback_storeId_source_createdAt_idx"
  ON "Feedback"("storeId", "source", "createdAt");

CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "AnonymousSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma does not represent this composite logo constraint in schema.prisma. Keep it across diffs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Store_logo_same_store'
  ) THEN
    ALTER TABLE "Store"
      ADD CONSTRAINT "Store_logo_same_store"
      FOREIGN KEY ("id", "logoAssetId") REFERENCES "Asset"("storeId", "id");
  END IF;
END $$;
