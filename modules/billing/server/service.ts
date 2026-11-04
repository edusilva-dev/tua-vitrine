import "server-only";
import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { assertBillingEnabled, getStripe, getStripePriceIds } from "@/lib/server/stripe";
import { analytics, type ServerAnalytics } from "@/modules/observability/server/analytics";
import {
  type BillingPlan,
  billingPlanSchema,
  type PaidBillingPlan,
  paidBillingPlanSchema,
} from "../contracts";
import { getEntitlements } from "./entitlements";

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID", "PAUSED"]);
const RECOVERABLE_STRIPE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);

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

async function applyStripeSubscription(
  tx: Prisma.TransactionClient,
  subscription: Stripe.Subscription
) {
  const stripeCustomerId = customerId(subscription.customer);
  const nextSubscription = subscriptionData(subscription);

  await tx.$queryRaw`SELECT "id" FROM "StoreSubscription" WHERE "stripeCustomerId" = ${stripeCustomerId} FOR UPDATE`;

  const previous = await tx.storeSubscription.findUnique({
    where: { stripeCustomerId },
    select: { storeId: true, plan: true, status: true, cancelAtPeriodEnd: true },
  });

  await tx.storeSubscription.updateMany({
    where: { stripeCustomerId },
    data: nextSubscription,
  });

  const resetProfessionalFeatures =
    nextSubscription.plan === "ESSENTIAL" &&
    (nextSubscription.status === "ACTIVE" || nextSubscription.status === "TRIALING");
  const resetToFree = ["CANCELED", "INCOMPLETE_EXPIRED"].includes(nextSubscription.status);

  if (previous && (resetProfessionalFeatures || resetToFree)) {
    await tx.store.update({
      where: { id: previous.storeId },
      data: {
        template: "grid",
        customization: { version: 1, tagline: "" },
        ...(resetToFree ? { primaryColor: "#2563eb" } : {}),
      },
    });
    await tx.promotionCampaign.deleteMany({ where: { storeId: previous.storeId } });
  }

  if (subscription.status === "trialing" || subscription.status === "active") {
    await tx.storeSubscription.updateMany({
      where: { stripeCustomerId, trialUsedAt: null },
      data: { trialUsedAt: new Date() },
    });
  }

  return previous ? { previous, next: nextSubscription } : null;
}

async function reportSubscriptionTransition(
  transition: Awaited<ReturnType<typeof applyStripeSubscription>>,
  observer: Pick<ServerAnalytics, "subscriptionStarted" | "subscriptionCancelled">
) {
  if (!transition) return;

  try {
    const { previous, next } = transition;
    const owner = await db.storeMember.findFirst({
      where: { storeId: previous.storeId, role: "OWNER" },
      select: { userId: true },
    });

    if (!owner) return;

    const priorPaid = previous.plan && previous.plan !== "FREE";
    const priorActive = previous.status && ACTIVE_STATUSES.has(previous.status);

    if (
      next.plan &&
      (next.status === "ACTIVE" || next.status === "TRIALING") &&
      (!priorActive || !priorPaid)
    ) {
      observer.subscriptionStarted(
        { distinctId: owner.userId },
        { storeId: previous.storeId, plan: next.plan, billingStatus: next.status }
      );
    }

    if (
      priorPaid &&
      ((next.cancelAtPeriodEnd && !previous.cancelAtPeriodEnd) ||
        (next.status === "CANCELED" &&
          previous.status !== "CANCELED" &&
          !previous.cancelAtPeriodEnd))
    ) {
      observer.subscriptionCancelled(
        { distinctId: owner.userId },
        {
          storeId: previous.storeId,
          plan: next.plan ?? previous.plan ?? "FREE",
          effectiveImmediately: next.status === "CANCELED",
        }
      );
    }
  } catch {
    logger.error("Falha na captura do evento de assinatura.");
  }
}

export async function synchronizeStripeSubscription(
  subscription: Stripe.Subscription,
  observer: Pick<
    ServerAnalytics,
    "subscriptionStartedReconciled" | "subscriptionCancelledReconciled"
  > = analytics
) {
  const transition = await db.$transaction((tx) => applyStripeSubscription(tx, subscription));

  await reportSubscriptionTransition(transition, {
    subscriptionStarted: observer.subscriptionStartedReconciled,
    subscriptionCancelled: observer.subscriptionCancelledReconciled,
  });
}

async function retrieveSubscription(
  stripe: Stripe,
  reference: string | Stripe.Subscription
): Promise<Stripe.Subscription> {
  return typeof reference === "string" ? stripe.subscriptions.retrieve(reference) : reference;
}

async function resolveStripeSubscription(
  stripe: Stripe,
  billing: { stripeCustomerId: string; stripeSubscriptionId: string | null },
  checkoutSessionId?: string
): Promise<Stripe.Subscription | null> {
  if (checkoutSessionId) {
    if (!checkoutSessionId.startsWith("cs_"))
      throw new AppError(400, "INVALID_CHECKOUT_SESSION", "Sessão de checkout inválida.");

    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ["subscription"],
    });
    const sessionCustomerId = session.customer ? customerId(session.customer) : null;

    if (sessionCustomerId !== billing.stripeCustomerId)
      throw new AppError(404, "CHECKOUT_NOT_FOUND", "Sessão de checkout não encontrada.");

    if (session.subscription) return retrieveSubscription(stripe, session.subscription);
  }

  if (billing.stripeSubscriptionId) {
    const currentSubscription = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);

    if (RECOVERABLE_STRIPE_STATUSES.has(currentSubscription.status)) return currentSubscription;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: billing.stripeCustomerId,
    status: "all",
    limit: 10,
  });

  return (
    subscriptions.data.find((subscription) =>
      RECOVERABLE_STRIPE_STATUSES.has(subscription.status)
    ) ?? null
  );
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
  const stripe = getStripe();
  const liveSubscription = await resolveStripeSubscription(stripe, billing);

  if (liveSubscription) {
    await synchronizeStripeSubscription(liveSubscription);
    throw new AppError(
      409,
      "SUBSCRIPTION_EXISTS",
      "Esta loja já possui uma assinatura. Use o portal para gerenciá-la."
    );
  }

  if (billing.status && ACTIVE_STATUSES.has(billing.status)) {
    throw new AppError(
      409,
      "SUBSCRIPTION_EXISTS",
      "Esta loja já possui uma assinatura. Use o portal para gerenciá-la."
    );
  }

  const appUrl = getEnv().APP_URL;
  const checkoutWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: billing.stripeCustomerId,
      line_items: [{ price: getStripePriceIds()[plan], quantity: 1 }],
      success_url: `${appUrl}/admin/billing?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/#planos`,
      integration_identifier: `tua_vitrine_${randomBytes(4).toString("hex")}`,
    },
    { idempotencyKey: `checkout-${context.storeId}-${plan}-${checkoutWindow}` }
  );

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

export async function getBillingStatus(context: StoreContext, checkoutSessionId?: string) {
  let billing = await db.storeSubscription.findUnique({
    where: { storeId: context.storeId },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      trialEnd: true,
      cancelAtPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  const billingEnabled = getEnv().BILLING_ENABLED;

  if (billingEnabled && billing) {
    try {
      const liveSubscription = await resolveStripeSubscription(
        getStripe(),
        billing,
        checkoutSessionId
      );

      if (liveSubscription) {
        const liveData = subscriptionData(liveSubscription);

        await synchronizeStripeSubscription(liveSubscription);
        billing = { ...billing, ...liveData };
      }
    } catch (error) {
      logger.warn(
        { err: error, storeId: context.storeId },
        "Falha ao reconciliar assinatura com o Stripe."
      );
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

export async function activateInternalTrial(context: StoreContext): Promise<void> {
  if (getEnv().BILLING_ENABLED) {
    const billing = await db.storeSubscription.findUnique({
      where: { storeId: context.storeId },
      select: {
        status: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        trialUsedAt: true,
      },
    });
    const needsStripeValidation =
      billing && !billing.trialUsedAt && (!billing.status || !ACTIVE_STATUSES.has(billing.status));

    if (needsStripeValidation) {
      try {
        const liveSubscription = await resolveStripeSubscription(getStripe(), billing);

        if (liveSubscription) await synchronizeStripeSubscription(liveSubscription);
      } catch (error) {
        logger.error(
          { err: error, storeId: context.storeId },
          "Falha ao validar assinatura antes de ativar o trial."
        );
        throw new AppError(
          503,
          "BILLING_UNAVAILABLE",
          "Não foi possível validar sua assinatura. Tente novamente em instantes."
        );
      }
    }
  }

  await db.$transaction(async (tx) => {
    const store = await tx.store.findUnique({
      where: { id: context.storeId },
      select: {
        onboardingCompletedAt: true,
        trialStartedAt: true,
        subscription: { select: { status: true, trialUsedAt: true } },
      },
    });

    if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

    if (!store.onboardingCompletedAt)
      throw new AppError(409, "ONBOARDING", "Conclua a configuração da loja antes do trial.");

    if (
      store.trialStartedAt ||
      store.subscription?.trialUsedAt ||
      (store.subscription?.status && ACTIVE_STATUSES.has(store.subscription.status))
    )
      throw new AppError(409, "TRIAL_UNAVAILABLE", "O trial desta loja já foi utilizado.");

    await tx.store.update({
      where: { id: context.storeId },
      data: { signupPlan: "PROFESSIONAL", trialStartedAt: new Date() },
    });
  });
}

export async function processStripeEvent(
  event: Stripe.Event,
  observer: Pick<ServerAnalytics, "subscriptionStarted" | "subscriptionCancelled"> = analytics,
  retrieveCurrentSubscription: (id: string) => Promise<Stripe.Subscription> = (id) =>
    getStripe().subscriptions.retrieve(id)
) {
  if (await db.stripeWebhookEvent.findUnique({ where: { id: event.id }, select: { id: true } }))
    return;

  let subscriptionId: string | null = null;
  let stripeCustomerId: string | null = null;

  if (event.type.startsWith("customer.subscription.")) {
    const current = event.data.object as Stripe.Subscription;

    subscriptionId = current.id;
    stripeCustomerId = customerId(current.customer);
  } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const reference = invoice.parent?.subscription_details?.subscription;

    if (reference) subscriptionId = typeof reference === "string" ? reference : reference.id;

    if (invoice.customer) stripeCustomerId = customerId(invoice.customer);
  } else if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const reference = session.subscription;

    if (reference) subscriptionId = typeof reference === "string" ? reference : reference.id;

    if (session.customer) stripeCustomerId = customerId(session.customer);
  }

  let transition: Awaited<ReturnType<typeof applyStripeSubscription>> = null;
  const staleVersion = Symbol("Stripe subscription changed during retrieval");

  for (let attempt = 0; attempt < 3; attempt++) {
    const before = stripeCustomerId
      ? await db.$queryRaw<Array<{ id: string; version: string }>>`
          SELECT "id", xmin::text AS "version" FROM "StoreSubscription"
          WHERE "stripeCustomerId" = ${stripeCustomerId}`
      : null;
    const subscription = subscriptionId ? await retrieveCurrentSubscription(subscriptionId) : null;

    try {
      transition = await db.$transaction(async (tx) => {
        await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });

        if (!subscription) return null;

        const liveCustomerId = customerId(subscription.customer);

        const current = await tx.$queryRaw<Array<{ id: string; version: string }>>`
          SELECT "id", xmin::text AS "version" FROM "StoreSubscription"
          WHERE "stripeCustomerId" = ${liveCustomerId} FOR UPDATE`;

        if (current[0]?.id !== before?.[0]?.id || current[0]?.version !== before?.[0]?.version)
          throw staleVersion;

        return applyStripeSubscription(tx, subscription);
      });
      await reportSubscriptionTransition(transition, observer);

      return;
    } catch (error) {
      if (error === staleVersion) continue;

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (await db.stripeWebhookEvent.findUnique({ where: { id: event.id } }))
      )
        return;

      throw error;
    }
  }

  throw new Error("A assinatura mudou durante a consulta ao Stripe.");
}
