ALTER TYPE "AdminAuditAction" ADD VALUE 'STORE_BLOCK';
ALTER TYPE "AdminAuditAction" ADD VALUE 'STORE_UNBLOCK';
ALTER TYPE "AdminAuditAction" ADD VALUE 'STOREFRONT_PUBLISH';
ALTER TYPE "AdminAuditAction" ADD VALUE 'STOREFRONT_UNPUBLISH';
ALTER TYPE "AdminAuditAction" ADD VALUE 'EMAIL_VERIFICATION_RESEND';
ALTER TYPE "AdminAuditAction" ADD VALUE 'TRIAL_END';
ALTER TYPE "AdminAuditAction" ADD VALUE 'MANUAL_PLAN_GRANT';

ALTER TABLE "Store" ADD COLUMN "trialEndedAt" TIMESTAMP(3), ADD COLUMN "adminBlockedAt" TIMESTAMP(3);

CREATE TABLE "ManualPlanGrant" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "plan" "BillingPlan" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "grantedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualPlanGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManualPlanGrant_storeId_key" ON "ManualPlanGrant"("storeId");
CREATE INDEX "ManualPlanGrant_expiresAt_idx" ON "ManualPlanGrant"("expiresAt");
CREATE INDEX "ManualPlanGrant_grantedById_createdAt_idx" ON "ManualPlanGrant"("grantedById", "createdAt");
ALTER TABLE "ManualPlanGrant" ADD CONSTRAINT "ManualPlanGrant_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualPlanGrant" ADD CONSTRAINT "ManualPlanGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
