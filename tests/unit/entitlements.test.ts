import { describe, expect, test } from "bun:test";
import { resolveEntitlements } from "@/modules/billing/server/entitlements";

const now = new Date("2026-09-24T12:00:00.000Z");

describe("entitlements", () => {
  test("loja ainda não ativada permanece no Free", () => {
    expect(
      resolveEntitlements(
        {
          onboardingCompletedAt: null,
          trialStartedAt: null,
          subscriptionPlan: null,
          subscriptionStatus: null,
          publishedProducts: 3,
        },
        now
      )
    ).toMatchObject({
      plan: "FREE",
      source: "FREE",
      productLimit: 10,
      imagesPerProductLimit: 1,
      metricsHistoryDays: 7,
      canImportProducts: false,
      needsProductSelection: false,
    });
  });

  test("ativação inicia 14 dias de Profissional sem cartão", () => {
    const value = resolveEntitlements(
      {
        onboardingCompletedAt: new Date("2026-09-20T12:00:00.000Z"),
        trialStartedAt: new Date("2026-09-20T12:00:00.000Z"),
        subscriptionPlan: null,
        subscriptionStatus: null,
        publishedProducts: 51,
      },
      now
    );

    expect(value).toMatchObject({
      plan: "PROFESSIONAL",
      source: "INTERNAL_TRIAL",
      trialEndsAt: "2026-10-04T12:00:00.000Z",
      trialDaysRemaining: 10,
      productLimit: 1000,
      imagesPerProductLimit: 5,
      canUsePromotionCampaign: true,
    });
  });

  test("trial expirado cai para Free e exige seleção sem despublicar dados", () => {
    expect(
      resolveEntitlements(
        {
          onboardingCompletedAt: new Date("2026-09-01T12:00:00.000Z"),
          trialStartedAt: new Date("2026-09-01T12:00:00.000Z"),
          subscriptionPlan: null,
          subscriptionStatus: null,
          publishedProducts: 11,
        },
        now
      )
    ).toMatchObject({
      plan: "FREE",
      source: "FREE",
      publishedProducts: 11,
      needsProductSelection: true,
    });
  });

  test("lojista pode encerrar o trial e escolher o Free", () => {
    expect(
      resolveEntitlements(
        {
          onboardingCompletedAt: new Date("2026-09-20T12:00:00.000Z"),
          trialStartedAt: new Date("2026-09-20T12:00:00.000Z"),
          subscriptionPlan: "FREE",
          subscriptionStatus: "CANCELED",
          trialUsedAt: now,
          publishedProducts: 4,
        },
        now
      )
    ).toMatchObject({ plan: "FREE", source: "FREE", trialDaysRemaining: 0 });
  });

  test("assinatura ativa prevalece e inadimplência perde os recursos pagos", () => {
    const base = {
      onboardingCompletedAt: new Date("2026-09-01T12:00:00.000Z"),
      trialStartedAt: null,
      subscriptionPlan: "ESSENTIAL" as const,
      publishedProducts: 40,
    };

    expect(resolveEntitlements({ ...base, subscriptionStatus: "ACTIVE" }, now)).toMatchObject({
      plan: "ESSENTIAL",
      source: "SUBSCRIPTION",
      productLimit: 50,
      canImportProducts: true,
    });
    expect(resolveEntitlements({ ...base, subscriptionStatus: "PAST_DUE" }, now)).toMatchObject({
      plan: "FREE",
      source: "FREE",
      needsProductSelection: true,
    });
  });

  test("Profissional tem limite técnico de 1.000 produtos", () => {
    expect(
      resolveEntitlements(
        {
          onboardingCompletedAt: null,
          trialStartedAt: null,
          subscriptionPlan: "PROFESSIONAL",
          subscriptionStatus: "ACTIVE",
          publishedProducts: 1001,
        },
        now
      )
    ).toMatchObject({
      productLimit: 1000,
      needsProductSelection: true,
      metricsHistoryDays: null,
      canUseFullCustomization: true,
    });
  });

  test("Free concluído mantém o trial disponível sem ativá-lo", () => {
    expect(
      resolveEntitlements(
        {
          onboardingCompletedAt: new Date("2026-09-20T12:00:00.000Z"),
          trialStartedAt: null,
          subscriptionPlan: null,
          subscriptionStatus: null,
          publishedProducts: 1,
        },
        now
      )
    ).toMatchObject({
      plan: "FREE",
      source: "FREE",
      trialAvailable: true,
      trialEndsAt: null,
    });
  });
});
