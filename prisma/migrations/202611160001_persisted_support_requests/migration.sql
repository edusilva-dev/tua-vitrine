ALTER TYPE "AdminAuditAction" ADD VALUE 'SUPPORT_UPDATE';

CREATE TYPE "SupportCategory" AS ENUM ('QUESTION', 'BILLING', 'TECHNICAL', 'FEEDBACK');
CREATE TYPE "SupportStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "SupportNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "SupportRequest" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "requesterId" TEXT,
  "requesterName" TEXT NOT NULL,
  "replyEmail" TEXT NOT NULL,
  "category" "SupportCategory" NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "SupportStatus" NOT NULL DEFAULT 'NEW',
  "internalNote" TEXT,
  "notificationStatus" "SupportNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "notificationAttemptedAt" TIMESTAMP(3),
  "notificationErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportRequest_storeId_createdAt_idx" ON "SupportRequest"("storeId", "createdAt");
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");
CREATE INDEX "SupportRequest_category_createdAt_idx" ON "SupportRequest"("category", "createdAt");
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
