CREATE TYPE "AdminAuditAction" AS ENUM ('BILLING_RECONCILE');
CREATE TYPE "AdminAuditResult" AS ENUM ('SUCCESS', 'FAILURE');

ALTER TABLE "StripeWebhookEvent" ADD COLUMN "storeId" UUID;

CREATE TABLE "AdminAuditEvent" (
  "id" UUID NOT NULL,
  "platformAdminId" UUID NOT NULL,
  "storeId" UUID,
  "action" "AdminAuditAction" NOT NULL,
  "result" "AdminAuditResult" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminAuditEvent_reason_length" CHECK (char_length("reason") BETWEEN 10 AND 500)
);

CREATE INDEX "StripeWebhookEvent_storeId_processedAt_idx"
  ON "StripeWebhookEvent"("storeId", "processedAt");
CREATE INDEX "AdminAuditEvent_storeId_createdAt_idx"
  ON "AdminAuditEvent"("storeId", "createdAt");
CREATE INDEX "AdminAuditEvent_platformAdminId_createdAt_idx"
  ON "AdminAuditEvent"("platformAdminId", "createdAt");
CREATE INDEX "AdminAuditEvent_action_result_createdAt_idx"
  ON "AdminAuditEvent"("action", "result", "createdAt");

ALTER TABLE "StripeWebhookEvent" ADD CONSTRAINT "StripeWebhookEvent_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_platformAdminId_fkey"
  FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
