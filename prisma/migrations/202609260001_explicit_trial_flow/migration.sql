ALTER TABLE "Store"
ADD COLUMN "signupPlan" "BillingPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN "trialStartedAt" TIMESTAMP(3);

-- Preserve the behavior and remaining trial time of stores created before this migration.
UPDATE "Store"
SET
  "signupPlan" = 'PROFESSIONAL',
  "trialStartedAt" = "onboardingCompletedAt"
WHERE "onboardingCompletedAt" IS NOT NULL;
