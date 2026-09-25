import "server-only";
import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { assertBillingEnabled, getStripe, getStripePriceIds } from "@/lib/server/stripe";
import { type PaidBillingPlan, paidBillingPlanSchema } from "../contracts";
import { getEntitlements } from "./entitlements";

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID", "PAUSED"]);

function toDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000) : null;
}

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  return typeof customer === "string" ? customer : customer.id;
}

function planFromPrice(priceId: string | undefined): PaidBillingPlan | null {
  if (!priceId) return null;

  const prices = getStripePriceIds();

  if (priceId === prices.ESSENTIAL) return "ESSENTIAL";

  if (priceId === prices.PROFESSIONAL) return "PROFESSIONAL";

  return null;
}

function subscriptionData(subscription: Stripe.Subscription) {
  const periodEnds = subscription.items.data.map((item) => item.current_period_end);
  const status = subscription.status.toUpperCase().replaceAll("-", "_") as
    | "INCOMPLETE"
    | "INCOMPLETE_EXPIRED"
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELED"
    | "UNPAID"
    | "PAUSED";

  return {
    stripeSubscriptionId: subscription.id,
    plan: planFromPrice(subscription.items.data[0]?.price.id),
    status,
    currentPeriodEnd: toDate(periodEnds.length ? Math.max(...periodEnds) : null),
    trialEnd: toDate(subscription.trial_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

async function ensureCustomer(context: StoreContext) {
  const current = await db.storeSubscription.findUnique({ where: { storeId: context.storeId } });

  if (current) return current;

  const store = await db.store.findUniqueOrThrow({
    where: { id: context.storeId },
    select: { name: true },
  });
  const customer = await getStripe().customers.create(
    { name: store.name, metadata: { storeId: context.storeId } },
    { idempotencyKey: `store-customer-${context.storeId}` }
  );

  try {
    return await db.storeSubscription.create({
      data: { storeId: context.storeId, stripeCustomerId: customer.id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.storeSubscription.findUniqueOrThrow({ where: { storeId: context.storeId } });
    }

    throw error;
  }
}

export async function createCheckout(context: StoreContext, input: unknown) {
  assertBillingEnabled();
  const plan = paidBillingPlanSchema.parse(input);
  const billing = await ensureCustomer(context);

  if (billing.status && ACTIVE_STATUSES.has(billing.status)) {
    throw new AppError(
      409,
      "SUBSCRIPTION_EXISTS",
      "Esta loja já possui uma assinatura. Use o portal para gerenciá-la."
    );
  }

  const stripe = getStripe();
  const appUrl = getEnv().APP_URL;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: billing.stripeCustomerId,
    line_items: [{ price: getStripePriceIds()[plan], quantity: 1 }],
    success_url: `${appUrl}/admin/settings?billing=success`,
    cancel_url: `${appUrl}/#planos`,
    integration_identifier: `tua_vitrine_${randomBytes(4).toString("hex")}`,
  });

  if (!session.url)
    throw new AppError(502, "STRIPE_SESSION", "O Stripe não retornou o endereço do checkout.");

  return { url: session.url };
}

export async function createPortal(context: StoreContext) {
  assertBillingEnabled();
  const billing = await db.storeSubscription.findUnique({ where: { storeId: context.storeId } });

  if (!billing)
    throw new AppError(
      404,
      "NO_BILLING_ACCOUNT",
      "Esta loja ainda não possui uma conta de cobrança."
    );

  const session = await getStripe().billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${getEnv().APP_URL}/admin/settings`,
  });

  return { url: session.url };
}

export async function getBillingStatus(context: StoreContext) {
  const billing = await db.storeSubscription.findUnique({
    where: { storeId: context.storeId },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      trialEnd: true,
      cancelAtPeriodEnd: true,
      stripeSubscriptionId: true,
    },
  });

  const entitlements = await getEntitlements(context);

  return {
    entitlements,
    enabled: getEnv().BILLING_MODE === "stripe",
    plan: billing?.plan ?? null,
    status: billing?.status ?? null,
    currentPeriodEnd: billing?.currentPeriodEnd?.toISOString() ?? null,
    trialEnd: billing?.trialEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
    canManage: Boolean(billing?.stripeSubscriptionId),
    canSubscribe: !billing?.status || !ACTIVE_STATUSES.has(billing.status),
  };
}

export async function processStripeEvent(event: Stripe.Event) {
  let subscription: Stripe.Subscription | null = null;

  if (event.type.startsWith("customer.subscription.")) {
    subscription = event.data.object as Stripe.Subscription;
  } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const reference = invoice.parent?.subscription_details?.subscription;

    if (reference) {
      subscription =
        typeof reference === "string"
          ? await getStripe().subscriptions.retrieve(reference)
          : reference;
    }
  } else if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const reference = session.subscription;

    if (reference) {
      subscription =
        typeof reference === "string"
          ? await getStripe().subscriptions.retrieve(reference)
          : reference;
    }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });

      if (!subscription) return;

      await tx.storeSubscription.updateMany({
        where: { stripeCustomerId: customerId(subscription.customer) },
        data: subscriptionData(subscription),
      });

      if (subscription.status === "trialing" || subscription.status === "active") {
        await tx.storeSubscription.updateMany({
          where: {
            stripeCustomerId: customerId(subscription.customer),
            trialUsedAt: null,
          },
          data: { trialUsedAt: new Date() },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;

    throw error;
  }
}
