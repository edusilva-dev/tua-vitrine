import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { db } from "@/lib/server/db";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { activateInternalTrial, processStripeEvent } from "@/modules/billing/server/service";
import {
  listProducts,
  saveProduct,
  selectPublishedProducts,
} from "@/modules/catalog/server/service";
import {
  getPublicPromotionCampaign,
  savePromotionCampaign,
} from "@/modules/promotions/server/service";
import { saveSettings } from "@/modules/stores/server/service";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (
  !["localhost", "127.0.0.1", "db"].includes(database.hostname) ||
  database.pathname !== "/tuavitrine_test"
) {
  throw new Error("Testes de planos exigem o banco local isolado tuavitrine_test.");
}

const storeId = randomUUID();
const context = { storeId };
const productIds = Array.from({ length: 11 }, () => randomUUID());

beforeAll(async () => {
  await db.store.create({
    data: {
      id: storeId,
      name: "Plano teste",
      slug: `plano-${storeId}`,
      whatsapp: "+5511999999999",
      status: "ACTIVE",
      onboardingCompletedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  });
  await db.product.createMany({
    data: productIds.map((id, index) => ({
      id,
      storeId,
      name: `Produto ${index + 1}`,
      description: "",
      priceCents: 1000,
      available: true,
      published: true,
    })),
  });
});

afterAll(async () => {
  await db.store.delete({ where: { id: storeId } });
});

test("Free exige seleção e a vitrine pública omite produtos despublicados", async () => {
  expect(await getEntitlements(context)).toMatchObject({
    plan: "FREE",
    productLimit: 10,
    needsProductSelection: true,
  });
  await expect(selectPublishedProducts(context, productIds)).rejects.toThrow();

  await selectPublishedProducts(context, productIds.slice(0, 10));

  expect((await listProducts(context)).pagination.total).toBe(11);
  expect((await listProducts(context, {}, { publishedOnly: true })).pagination.total).toBe(10);
});

test("Free limita cada produto a uma imagem também no servidor", async () => {
  await expect(
    saveProduct(
      context,
      {
        name: "Produto com duas fotos",
        description: "",
        priceCents: 1000,
        discountPriceCents: null,
        available: true,
        categoryName: "",
        assetIds: [randomUUID(), randomUUID()],
        variants: [],
      },
      productIds[0]
    )
  ).rejects.toThrow("Seu plano permite até 1 imagem por produto.");
});

test("Free bloqueia cor e campanha, e Profissional libera campanha", async () => {
  const freeSettings = await saveSettings(context, {
    name: "Plano teste",
    whatsapp: "+5511999999999",
    primaryColor: "#ff0000",
    template: "list",
    logoAssetId: null,
    customization: { version: 1, tagline: "Personalização antiga" },
  });

  expect(freeSettings).toMatchObject({
    primaryColor: "#2563eb",
    template: "grid",
    customization: { version: 1, tagline: "" },
  });
  expect(await db.store.findUniqueOrThrow({ where: { id: storeId } })).toMatchObject({
    primaryColor: "#2563eb",
    template: "grid",
    customization: { version: 1, tagline: "" },
  });
  await expect(
    savePromotionCampaign(context, {
      title: "Oferta",
      description: "Seleção",
      ctaLabel: "Ver produtos",
      active: true,
      bannerAssetId: null,
      productIds: [productIds[0]],
    })
  ).rejects.toThrow();

  await db.storeSubscription.create({
    data: {
      storeId,
      stripeCustomerId: `cus_${storeId}`,
      stripeSubscriptionId: `sub_${storeId}`,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
    },
  });
  await savePromotionCampaign(context, {
    title: "Oferta",
    description: "Seleção",
    ctaLabel: "Ver produtos",
    active: true,
    bannerAssetId: null,
    productIds: [productIds[0]],
  });

  expect(await getPublicPromotionCampaign(context)).toMatchObject({
    title: "Oferta",
    productIds: [productIds[0]],
  });
  await saveSettings(context, {
    name: "Plano teste",
    whatsapp: "+5511999999999",
    primaryColor: "#ff0000",
    template: "list",
    logoAssetId: null,
    customization: { version: 1, tagline: "Profissional" },
  });
  await processStripeEvent({
    id: `evt_${randomUUID()}`,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: `sub_${storeId}`,
        customer: `cus_${storeId}`,
        status: "active",
        cancel_at_period_end: false,
        trial_end: null,
        items: {
          data: [
            {
              current_period_end: Math.floor(Date.now() / 1000) + 86400,
              price: { id: process.env.STRIPE_PRICE_BASIC_MONTHLY },
            },
          ],
        },
      },
    },
  } as unknown as Stripe.Event);

  expect(await db.store.findUniqueOrThrow({ where: { id: storeId } })).toMatchObject({
    primaryColor: "#ff0000",
    template: "grid",
    customization: { version: 1, tagline: "" },
  });
  expect(await getPublicPromotionCampaign(context)).toBeNull();
});

test("Free ativa o trial sob demanda uma única vez", async () => {
  const freeStoreId = randomUUID();
  const freeContext = { storeId: freeStoreId };

  await db.store.create({
    data: {
      id: freeStoreId,
      name: "Free com trial disponível",
      slug: `free-trial-${freeStoreId}`,
      whatsapp: "+5511999999999",
      status: "ACTIVE",
      onboardingCompletedAt: new Date(),
      signupPlan: "FREE",
    },
  });

  try {
    expect(await getEntitlements(freeContext)).toMatchObject({
      plan: "FREE",
      trialAvailable: true,
    });

    await activateInternalTrial(freeContext);

    expect(await getEntitlements(freeContext)).toMatchObject({
      plan: "PROFESSIONAL",
      source: "INTERNAL_TRIAL",
      trialAvailable: false,
      trialDaysRemaining: 14,
    });
    await expect(activateInternalTrial(freeContext)).rejects.toThrow(
      "O trial desta loja já foi utilizado."
    );
  } finally {
    await db.store.delete({ where: { id: freeStoreId } });
  }
});

test("cadastro por plano pago inicia o trial Profissional ao publicar a loja", async () => {
  const paidStoreId = randomUUID();
  const paidContext = { storeId: paidStoreId };

  await db.store.create({
    data: {
      id: paidStoreId,
      name: "Cadastro Essencial",
      slug: `essencial-trial-${paidStoreId}`,
      whatsapp: "+5511999999999",
      signupPlan: "ESSENTIAL",
    },
  });

  try {
    await saveProduct(paidContext, {
      name: "Primeiro produto",
      description: "",
      priceCents: 1000,
      discountPriceCents: null,
      available: true,
      categoryName: "",
      assetIds: [],
      variants: [],
    });

    expect(await getEntitlements(paidContext)).toMatchObject({
      plan: "PROFESSIONAL",
      source: "INTERNAL_TRIAL",
      trialDaysRemaining: 14,
    });
  } finally {
    await db.store.delete({ where: { id: paidStoreId } });
  }
});
