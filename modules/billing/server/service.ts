import "server-only";
import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { assertBillingEnabled, getStripe, getStripePriceIds } from "@/lib/server/stripe";
import {
  type BillingPlan,
  billingPlanSchema,
  type PaidBillingPlan,
  paidBillingPlanSchema,
} from "../contracts";
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
    success_url: `${appUrl}/admin/billing?billing=success`,
    cancel_url: `${appUrl}/#planos`,
    integration_identifier: `tua_vitrine_${randomBytes(4).toString("hex")}`,
  });

  if (!session.url)
    throw new AppError(502, "STRIPE_SESSION", "O Stripe não retornou o endereço do checkout.");

  return { url: session.url };
}

async function portalConfiguration(stripe: Stripe) {
  const prices = getStripePriceIds();
  const [essentialPrice, professionalPrice, configurations] = await Promise.all([
    stripe.prices.retrieve(prices.ESSENTIAL),
    stripe.prices.retrieve(prices.PROFESSIONAL),
    stripe.billingPortal.configurations.list({ active: true, limit: 100 }),
  ]);
  const pricesByProduct = new Map<string, string[]>();

  for (const price of [essentialPrice, professionalPrice]) {
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const productPrices = pricesByProduct.get(productId) ?? [];

    productPrices.push(price.id);
    pricesByProduct.set(productId, productPrices);
  }

  const products = Array.from(pricesByProduct, ([product, productIds]) => ({
    product,
    prices: productIds,
  }));
  const configuration = configurations.data.find((item) => item.metadata?.tuaVitrine === "true");
  const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end" as const,
      cancellation_reason: {
        enabled: true,
        options: ["too_expensive", "missing_features", "unused", "other"],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "always_invoice",
      products,
    },
  };

  if (configuration) {
    return stripe.billingPortal.configurations.update(configuration.id, {
      features,
      metadata: { ...configuration.metadata, tuaVitrine: "true" },
      name: "Tua Vitrine",
    });
  }

  return stripe.billingPortal.configurations.create({
    features,
    metadata: { tuaVitrine: "true" },
    name: "Tua Vitrine",
  });
}

export async function createPortal(context: StoreContext, input?: unknown) {
  assertBillingEnabled();
  const targetPlan: BillingPlan | undefined =
    input === undefined ? undefined : billingPlanSchema.parse(input);
  const billing = await db.storeSubscription.findUnique({ where: { storeId: context.storeId } });

  if (!billing)
    throw new AppError(
      404,
      "NO_BILLING_ACCOUNT",
      "Esta loja ainda não possui uma conta de cobrança."
    );

  const stripe = getStripe();
  const returnUrl = `${getEnv().APP_URL}/admin/billing?billing=updated`;
  let flowData: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;
  let configurationId: string | undefined;

  if (targetPlan) {
    configurationId = (await portalConfiguration(stripe)).id;

    if (!billing.stripeSubscriptionId)
      throw new AppError(
        409,
        "NO_ACTIVE_SUBSCRIPTION",
        "Esta loja ainda não possui uma assinatura paga para alterar."
      );

    if (targetPlan === billing.plan && !billing.cancelAtPeriodEnd)
      throw new AppError(409, "PLAN_ALREADY_ACTIVE", "Este já é o plano atual da loja.");

    const afterCompletion = {
      type: "redirect" as const,
      redirect: { return_url: returnUrl },
    };

    if (targetPlan === "FREE") {
      flowData = {
        type: "subscription_cancel",
        subscription_cancel: { subscription: billing.stripeSubscriptionId },
        after_completion: afterCompletion,
      };
    } else {
      const subscription = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);
      const item = subscription.items.data[0];

      if (!item)
        throw new AppError(409, "SUBSCRIPTION_ITEM_MISSING", "A assinatura não possui um plano.");

      flowData = {
        type: "subscription_update_confirm",
        subscription_update_confirm: {
          subscription: billing.stripeSubscriptionId,
          items: [{ id: item.id, price: getStripePriceIds()[targetPlan], quantity: 1 }],
        },
        after_completion: afterCompletion,
      };
    }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    ...(configurationId ? { configuration: configurationId } : {}),
    return_url: `${getEnv().APP_URL}/admin/billing`,
    ...(flowData ? { flow_data: flowData } : {}),
  });

  return { url: session.url };
}

export async function changePlan(context: StoreContext, input: unknown) {
  const targetPlan = billingPlanSchema.parse(input);
  const [billing, entitlements] = await Promise.all([
    db.storeSubscription.findUnique({ where: { storeId: context.storeId } }),
    getEntitlements(context),
  ]);

  if (targetPlan === entitlements.plan && !billing?.cancelAtPeriodEnd)
    throw new AppError(409, "PLAN_ALREADY_ACTIVE", "Este já é o plano atual da loja.");

  if (targetPlan !== "FREE") {
    if (billing?.stripeSubscriptionId && billing.status && ACTIVE_STATUSES.has(billing.status))
      return createPortal(context, targetPlan);

    return createCheckout(context, targetPlan);
  }

  if (billing?.stripeSubscriptionId && billing.status && ACTIVE_STATUSES.has(billing.status))
    return createPortal(context, "FREE");

  const customer = await ensureCustomer(context);

  await db.$transaction([
    db.storeSubscription.update({
      where: { id: customer.id },
      data: {
        plan: "FREE",
        status: "CANCELED",
        trialUsedAt: customer.trialUsedAt ?? new Date(),
        cancelAtPeriodEnd: false,
      },
    }),
    db.store.update({
      where: { id: context.storeId },
      data: {
        primaryColor: "#2563eb",
        template: "grid",
        customization: { version: 1, tagline: "" },
      },
    }),
    db.promotionCampaign.deleteMany({ where: { storeId: context.storeId } }),
  ]);

  return { url: null };
}

export async function getBillingStatus(context: StoreContext) {
  let billing = await db.storeSubscription.findUnique({
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
  const billingEnabled = getEnv().BILLING_MODE === "stripe";

  if (billingEnabled && billing?.stripeSubscriptionId) {
    try {
      const liveSubscription = await getStripe().subscriptions.retrieve(
        billing.stripeSubscriptionId
      );
      const liveData = subscriptionData(liveSubscription);

      await db.storeSubscription.update({
        where: { storeId: context.storeId },
        data: liveData,
      });
      billing = { ...billing, ...liveData };
    } catch {
      // Webhooks remain the source of truth if Stripe is temporarily unavailable.
    }
  }

  const entitlements = await getEntitlements(context);

  return {
    entitlements,
    enabled: billingEnabled,
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

      const stripeCustomerId = customerId(subscription.customer);
      const nextSubscription = subscriptionData(subscription);

      await tx.storeSubscription.updateMany({
        where: { stripeCustomerId },
        data: nextSubscription,
      });

      const billing = await tx.storeSubscription.findUnique({
        where: { stripeCustomerId },
        select: { storeId: true },
      });
      const resetProfessionalFeatures =
        nextSubscription.plan === "ESSENTIAL" &&
        (nextSubscription.status === "ACTIVE" || nextSubscription.status === "TRIALING");
      const resetToFree = ["CANCELED", "INCOMPLETE_EXPIRED"].includes(nextSubscription.status);

      if (billing && (resetProfessionalFeatures || resetToFree)) {
        await tx.store.update({
          where: { id: billing.storeId },
          data: {
            template: "grid",
            customization: { version: 1, tagline: "" },
            ...(resetToFree ? { primaryColor: "#2563eb" } : {}),
          },
        });
        await tx.promotionCampaign.deleteMany({ where: { storeId: billing.storeId } });
      }

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
