import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { db } from "@/lib/server/db";
import {
  processStripeEvent,
  synchronizeStripeSubscription,
} from "@/modules/billing/server/service";
import {
  createServerAnalytics,
  type ServerAnalyticsMessage,
} from "@/modules/observability/server/analytics";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
)
  throw new Error("Testes de billing exigem o banco local isolado tuavitrine_test.");

const userId = randomBytes(16).toString("hex");
const storeId = randomUUID();
const customerId = `cus_${storeId}`;
const subscriptionId = `sub_${storeId}`;
const events: ServerAnalyticsMessage[] = [];
const observer = createServerAnalytics({
  getRuntime: () => ({
    client: { capture: (message) => events.push(message) },
    environment: "staging",
    release: "test-release",
  }),
});
const originalPrices = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_BASIC_MONTHLY: process.env.STRIPE_PRICE_BASIC_MONTHLY,
  STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
};

function webhook(
  status: Stripe.Subscription.Status,
  options: { price?: "ESSENTIAL" | "PROFESSIONAL"; cancelAtPeriodEnd?: boolean } = {},
  id = `evt_${randomUUID()}`
): Stripe.Event {
  return {
    id,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: subscriptionId,
        customer: customerId,
        status,
        cancel_at_period_end: options.cancelAtPeriodEnd ?? false,
        trial_end: null,
        items: {
          data: [
            {
              current_period_end: Math.floor(Date.now() / 1000) + 86400,
              price: {
                id:
                  options.price === "PROFESSIONAL"
                    ? process.env.STRIPE_PRICE_PRO_MONTHLY
                    : process.env.STRIPE_PRICE_BASIC_MONTHLY,
              },
            },
          ],
        },
      },
    },
  } as unknown as Stripe.Event;
}

async function applyWebhook(
  event: Stripe.Event,
  target: Pick<typeof observer, "subscriptionStarted" | "subscriptionCancelled"> = observer,
  current = event.data.object as Stripe.Subscription
) {
  await processStripeEvent(event, target, async (id) => {
    expect(id).toBe(subscriptionId);

    return current;
  });
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "rk_test_billing_observability";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_billing_observability";
  process.env.STRIPE_PRICE_BASIC_MONTHLY = "price_basic_billing_observability";
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_billing_observability";

  await db.user.create({
    data: {
      id: userId,
      name: "Billing observability test",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.store.create({
    data: {
      id: storeId,
      name: "Billing observability test",
      slug: `billing-observability-${storeId}`,
      whatsapp: "+5511999999999",
      status: "ACTIVE",
      onboardingCompletedAt: new Date(),
      members: { create: { userId, role: "OWNER" } },
      subscription: { create: { stripeCustomerId: customerId } },
    },
  });
});

afterAll(async () => {
  await db.store.deleteMany({ where: { id: storeId } });
  await db.user.deleteMany({ where: { id: userId } });

  for (const [name, value] of Object.entries(originalPrices)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

beforeEach(async () => {
  events.length = 0;
  await db.storeSubscription.update({
    where: { storeId },
    data: { plan: null, status: null, cancelAtPeriodEnd: false },
  });
});

test("webhook captura primeira ativação uma vez e ignora mudança entre planos pagos", async () => {
  const started = webhook("trialing");

  await applyWebhook(started);
  await applyWebhook(started);
  await applyWebhook(webhook("active"));
  await applyWebhook(webhook("active", { price: "PROFESSIONAL" }));

  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    distinctId: userId,
    event: "subscription_started",
    groups: { store: storeId },
    properties: { store_id: storeId, plan: "ESSENTIAL", billing_status: "TRIALING" },
  });
});

test("dois webhooks distintos concorrentes registram uma única ativação", async () => {
  await Promise.all([applyWebhook(webhook("active")), applyWebhook(webhook("active"))]);

  expect(events.filter(({ event }) => event === "subscription_started")).toHaveLength(1);
});

test("reconciliação anterior ao webhook preserva um único evento confirmado", async () => {
  const activated = webhook("active");

  await synchronizeStripeSubscription(activated.data.object as Stripe.Subscription, observer);
  await applyWebhook(activated);

  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    event: "subscription_started",
    properties: { source: "stripe_reconciliation", plan: "ESSENTIAL" },
  });

  const scheduled = webhook("active", { cancelAtPeriodEnd: true });

  await synchronizeStripeSubscription(scheduled.data.object as Stripe.Subscription, observer);
  await applyWebhook(scheduled);

  expect(events).toHaveLength(2);
  expect(events[1]).toMatchObject({
    event: "subscription_cancelled",
    properties: { source: "stripe_reconciliation", effective_immediately: false },
  });
});

test("snapshot antigo entregue depois da reconciliação não regride nem duplica a assinatura", async () => {
  const current = webhook("active").data.object as Stripe.Subscription;

  await synchronizeStripeSubscription(current, observer);

  const stale = webhook("incomplete");

  stale.type = "customer.subscription.created";
  await applyWebhook(stale, observer, current);
  await applyWebhook(webhook("active"), observer, current);

  expect(await db.storeSubscription.findUniqueOrThrow({ where: { storeId } })).toMatchObject({
    status: "ACTIVE",
    plan: "ESSENTIAL",
  });
  expect(events.filter(({ event }) => event === "subscription_started")).toHaveLength(1);
  expect(events[0]?.properties.source).toBe("stripe_reconciliation");
});

test("cancelamento agendado e conclusão não duplicam evento", async () => {
  await applyWebhook(webhook("active", { price: "PROFESSIONAL" }));
  const scheduled = webhook("active", { price: "PROFESSIONAL", cancelAtPeriodEnd: true });

  await applyWebhook(scheduled);
  await applyWebhook(scheduled);
  await applyWebhook(webhook("canceled", { price: "PROFESSIONAL" }));

  expect(events).toHaveLength(2);
  expect(events[1]).toMatchObject({
    distinctId: userId,
    event: "subscription_cancelled",
    groups: { store: storeId },
    properties: { store_id: storeId, plan: "PROFESSIONAL", effective_immediately: false },
  });
});

test("cancelamento junto da troca de plano informa o plano confirmado", async () => {
  await applyWebhook(webhook("active"));
  await applyWebhook(webhook("active", { price: "PROFESSIONAL", cancelAtPeriodEnd: true }));

  expect(events.at(-1)).toMatchObject({
    event: "subscription_cancelled",
    properties: { store_id: storeId, plan: "PROFESSIONAL", effective_immediately: false },
  });
});

test("cancelamento imediato e falha do observador não revertem o webhook", async () => {
  await applyWebhook(webhook("active", { price: "PROFESSIONAL" }));
  const failing = {
    subscriptionStarted: observer.subscriptionStarted,
    subscriptionCancelled: () => {
      throw new Error("Telemetry failed");
    },
  };
  const cancelled = webhook("canceled", { price: "PROFESSIONAL" });

  await applyWebhook(cancelled, failing);
  await applyWebhook(cancelled, failing);

  expect(await db.storeSubscription.findUniqueOrThrow({ where: { storeId } })).toMatchObject({
    status: "CANCELED",
    plan: "PROFESSIONAL",
  });
  expect(await db.stripeWebhookEvent.count({ where: { id: cancelled.id } })).toBe(1);
  expect(events).toHaveLength(1);
});
