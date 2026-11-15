import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { db } from "@/lib/server/db";
import { reconcileStripeBillingForStore } from "@/modules/billing/server/service";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de reconciliação exigem o banco local isolado tuavitrine_test.");
}

const marker = randomUUID();
const essentialPriceId = `price_essential_${marker}`;
let storeId = "";

function subscription(status: Stripe.Subscription.Status): Stripe.Subscription {
  return {
    id: `sub_reconcile_${marker}`,
    customer: `cus_reconcile_${marker}`,
    status,
    ended_at: status === "canceled" ? 1_794_758_400 : null,
    canceled_at: status === "canceled" ? 1_794_758_400 : null,
    trial_end: null,
    cancel_at_period_end: false,
    items: {
      data: [
        {
          current_period_end: 1_797_350_400,
          price: { id: essentialPriceId },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

function stripeWith(remote: Stripe.Subscription | null): Stripe {
  return {
    subscriptions: {
      retrieve: async () => {
        if (!remote) throw new Error("Stripe indisponível");

        return remote;
      },
      list: async () => ({ data: remote ? [remote] : [] }),
    },
  } as unknown as Stripe;
}

function stripeWithoutSubscriptions(): Stripe {
  return {
    subscriptions: { list: async () => ({ data: [] }) },
  } as unknown as Stripe;
}

function stripeWithMissingCustomer(): Stripe {
  const missing = () =>
    new Stripe.errors.StripeInvalidRequestError({
      type: "invalid_request_error",
      message: "No such customer",
      code: "resource_missing",
      statusCode: 404,
    });

  return {
    subscriptions: {
      retrieve: async () => {
        throw missing();
      },
      list: async () => {
        throw missing();
      },
    },
  } as unknown as Stripe;
}

beforeAll(async () => {
  process.env.STRIPE_PRICE_BASIC_MONTHLY = essentialPriceId;
  process.env.STRIPE_PRICE_PRO_MONTHLY = `price_professional_${marker}`;
  const store = await db.store.create({
    data: {
      name: `Reconciliação ${marker}`,
      slug: `reconciliation-${marker}`,
      subscription: {
        create: {
          stripeCustomerId: `cus_reconcile_${marker}`,
          stripeSubscriptionId: `sub_reconcile_${marker}`,
          plan: "PROFESSIONAL",
          status: "PAST_DUE",
        },
      },
    },
    select: { id: true },
  });

  storeId = store.id;
});

afterAll(async () => {
  await db.store.deleteMany({ where: { id: storeId } });
  delete process.env.STRIPE_PRICE_BASIC_MONTHLY;
  delete process.env.STRIPE_PRICE_PRO_MONTHLY;
});

test("reutiliza a regra dos webhooks para assinatura ativa e cancelada", async () => {
  const active = await reconcileStripeBillingForStore(storeId, stripeWith(subscription("active")));

  expect(active.after).toMatchObject({ plan: "ESSENTIAL", status: "ACTIVE" });

  const canceled = await reconcileStripeBillingForStore(
    storeId,
    stripeWith(subscription("canceled"))
  );

  expect(canceled.after).toMatchObject({ plan: "ESSENTIAL", status: "CANCELED" });
  expect(canceled.after.currentPeriodEnd).toBe("2026-11-15T16:00:00.000Z");
});

test("falha remota preserva integralmente o estado local", async () => {
  const before = await db.storeSubscription.findUniqueOrThrow({ where: { storeId } });

  expect(reconcileStripeBillingForStore(storeId, stripeWith(null))).rejects.toThrow(
    "Stripe indisponível"
  );

  const after = await db.storeSubscription.findUniqueOrThrow({ where: { storeId } });

  expect(after).toEqual(before);
});

test("cliente sem assinatura remota limpa somente o estado local de assinatura", async () => {
  await db.storeSubscription.update({
    where: { storeId },
    data: {
      stripeSubscriptionId: null,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-12-01T00:00:00.000Z"),
    },
  });

  const result = await reconcileStripeBillingForStore(storeId, stripeWithoutSubscriptions());

  expect(result.remoteFound).toBeFalse();
  expect(result.after).toMatchObject({
    plan: null,
    status: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
  });
});

test("recurso inexistente na Stripe retorna erro operacional e preserva os dados", async () => {
  await db.storeSubscription.update({
    where: { storeId },
    data: {
      stripeSubscriptionId: `sub_missing_${marker}`,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
    },
  });
  const before = await db.storeSubscription.findUniqueOrThrow({ where: { storeId } });

  expect(reconcileStripeBillingForStore(storeId, stripeWithMissingCustomer())).rejects.toThrow(
    "não existe na Stripe deste ambiente"
  );
  expect(await db.storeSubscription.findUniqueOrThrow({ where: { storeId } })).toEqual(before);
});
