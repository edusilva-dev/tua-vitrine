import "server-only";
import Stripe from "stripe";
import { getEnv } from "./env";
import { AppError } from "./http";

let client: Stripe | undefined;

function required(name: string): string {
  const value = process.env[name];

  if (!value)
    throw new AppError(
      503,
      "BILLING_UNAVAILABLE",
      "As assinaturas estão temporariamente indisponíveis."
    );

  return value;
}

export function getStripe(): Stripe {
  assertBillingEnabled();
  client ??= new Stripe(required("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-08-26.dahlia",
    typescript: true,
  });

  return client;
}

export function assertBillingEnabled(): void {
  if (getEnv().BILLING_MODE !== "stripe") {
    throw new AppError(
      503,
      "BILLING_UNAVAILABLE",
      "As assinaturas estão temporariamente indisponíveis."
    );
  }
}

export function getStripeWebhookSecret(): string {
  return required("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceIds() {
  return {
    ESSENTIAL: required("STRIPE_PRICE_BASIC_MONTHLY"),
    PROFESSIONAL: required("STRIPE_PRICE_PRO_MONTHLY"),
  } as const;
}
