import { describe, expect, mock, test } from "bun:test";
import { createClientAnalytics } from "@/modules/observability/client/analytics";
import {
  analyticsEventSchemas,
  analyticsEvents,
  type ProductCreatedInput,
} from "@/modules/observability/contracts/events";
import { createServerAnalytics } from "@/modules/observability/server/analytics";

const storeId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";
const context = {
  environment: "staging" as const,
  release: "0123456789abcdef",
};

const validInputs = {
  landingPageViewed: { source: "organic" },
  landingCtaClicked: {
    source: "campaign",
    cta: "start_trial",
    location: "pricing",
    selectedPlan: "PROFESSIONAL",
  },
  accountCreated: { signupPlan: "FREE", source: "email_password" },
  storeCreated: { storeId, plan: "FREE", source: "onboarding" },
  storePublished: { storeId, plan: "FREE", productCount: 1 },
  productCreationStarted: { storeId, source: "admin" },
  productCreated: {
    storeId,
    productId,
    creationMethod: "manual",
    isFirstProduct: true,
  },
  productDeleted: { storeId, productCount: 2, operation: "bulk" },
  catalogViewed: { storeId, plan: "PROFESSIONAL", source: "campaign" },
  productViewed: { storeId, productId, source: "direct" },
  whatsappClicked: { storeId, location: "product_detail", productId },
  subscriptionStarted: { storeId, plan: "ESSENTIAL", billingStatus: "ACTIVE" },
  subscriptionCancelled: { storeId, plan: "PROFESSIONAL", effectiveImmediately: false },
} as const;

describe("contrato de analytics", () => {
  test("define os 13 eventos com propriedades comuns consistentes", () => {
    const events = [
      analyticsEvents.landingPageViewed(validInputs.landingPageViewed, context),
      analyticsEvents.landingCtaClicked(validInputs.landingCtaClicked, context),
      analyticsEvents.accountCreated(validInputs.accountCreated, context),
      analyticsEvents.storeCreated(validInputs.storeCreated, context),
      analyticsEvents.storePublished(validInputs.storePublished, context),
      analyticsEvents.productCreationStarted(validInputs.productCreationStarted, context),
      analyticsEvents.productCreated(validInputs.productCreated, context),
      analyticsEvents.productDeleted(validInputs.productDeleted, context),
      analyticsEvents.catalogViewed(validInputs.catalogViewed, context),
      analyticsEvents.productViewed(validInputs.productViewed, context),
      analyticsEvents.whatsappClicked(validInputs.whatsappClicked, context),
      analyticsEvents.subscriptionStarted(validInputs.subscriptionStarted, context),
      analyticsEvents.subscriptionCancelled(validInputs.subscriptionCancelled, context),
    ];

    expect(events.map((event) => event?.name)).toEqual([
      "landing_page_viewed",
      "landing_cta_clicked",
      "account_created",
      "store_created",
      "store_published",
      "product_creation_started",
      "product_created",
      "product_deleted",
      "catalog_viewed",
      "product_viewed",
      "whatsapp_clicked",
      "subscription_started",
      "subscription_cancelled",
    ]);

    for (const event of events) {
      expect(event?.properties).toMatchObject({
        schema_version: 1,
        environment: "staging",
        release: "0123456789abcdef",
      });
    }
  });

  test("normaliza nomes e valores opcionais sem enviar dados livres", () => {
    expect(analyticsEvents.landingCtaClicked(validInputs.landingCtaClicked, context)).toEqual({
      name: "landing_cta_clicked",
      properties: {
        schema_version: 1,
        environment: "staging",
        release: "0123456789abcdef",
        surface: "landing",
        source: "campaign",
        cta: "start_trial",
        location: "pricing",
        selected_plan: "PROFESSIONAL",
      },
    });

    expect(analyticsEvents.productCreated(validInputs.productCreated, context)).toEqual({
      name: "product_created",
      properties: {
        schema_version: 1,
        environment: "staging",
        release: "0123456789abcdef",
        surface: "admin",
        source: "manual",
        store_id: storeId,
        product_id: productId,
        creation_method: "manual",
        is_first_product: true,
      },
    });

    expect(
      analyticsEvents.whatsappClicked(
        { storeId, location: "store_hero" },
        { environment: "development", release: "  " }
      )
    ).toEqual({
      name: "whatsapp_clicked",
      properties: {
        schema_version: 1,
        environment: "development",
        release: null,
        surface: "storefront",
        source: "storefront",
        store_id: storeId,
        location: "store_hero",
      },
    });
  });

  test("rejeita propriedades desconhecidas, PII e enums não documentados", () => {
    expect(() =>
      analyticsEvents.landingPageViewed(
        {
          ...validInputs.landingPageViewed,
          url: "https://example.test/?utm=email",
        } as typeof validInputs.landingPageViewed,
        context
      )
    ).toThrow();
    expect(() =>
      analyticsEvents.landingCtaClicked(
        { source: "direct", cta: "create_store", location: "pricing" },
        context
      )
    ).toThrow();
    expect(() =>
      analyticsEvents.productCreated(
        { ...validInputs.productCreated, email: "lojista@example.test" } as ProductCreatedInput,
        context
      )
    ).toThrow();
    expect(() =>
      analyticsEvents.whatsappClicked(
        {
          ...validInputs.whatsappClicked,
          message: "conteúdo livre",
        } as typeof validInputs.whatsappClicked,
        context
      )
    ).toThrow();
    expect(
      analyticsEventSchemas.catalog_viewed.safeParse({
        ...analyticsEvents.catalogViewed(validInputs.catalogViewed, context)?.properties,
        source: "full_url",
      }).success
    ).toBe(false);
  });

  test("os tipos recusam propriedades e valores fora do catálogo", () => {
    type ProductInput = Parameters<typeof analyticsEvents.productCreated>[0];
    type WhatsappInput = Parameters<typeof analyticsEvents.whatsappClicked>[0];

    // @ts-expect-error campo livre não pertence ao payload
    const product: ProductInput = { ...validInputs.productCreated, name: "Produto" };
    // @ts-expect-error localização fora do enum documentado
    const whatsapp: WhatsappInput = { storeId, location: "footer" };

    expect(product.storeId).toBe(storeId);
    expect(whatsapp.storeId).toBe(storeId);
  });
});

describe("adaptador de analytics do browser", () => {
  test("captura somente com configuração e consentimento", () => {
    const capture = mock(() => undefined);
    const withoutConsent = createClientAnalytics({
      enabled: true,
      hasConsent: () => false,
      capture,
      context,
    });
    const disabled = createClientAnalytics({
      enabled: false,
      hasConsent: () => true,
      capture,
      context,
    });

    withoutConsent.catalogViewed(validInputs.catalogViewed);
    disabled.catalogViewed(validInputs.catalogViewed);
    expect(capture).not.toHaveBeenCalled();

    const enabled = createClientAnalytics({
      enabled: true,
      hasConsent: () => true,
      capture,
      context,
    });

    enabled.landingPageViewed(validInputs.landingPageViewed);
    enabled.landingCtaClicked(validInputs.landingCtaClicked);
    enabled.productViewed(validInputs.productViewed);

    expect(capture).toHaveBeenCalledWith(
      "landing_cta_clicked",
      expect.objectContaining({
        source: "campaign",
        location: "pricing",
        selected_plan: "PROFESSIONAL",
      })
    );
    expect(capture).toHaveBeenCalledWith(
      "product_viewed",
      expect.objectContaining({ store_id: storeId, product_id: productId })
    );
  });

  test("falha do fornecedor não escapa para o fluxo do produto", () => {
    const analytics = createClientAnalytics({
      enabled: true,
      hasConsent: () => true,
      capture: () => {
        throw new Error("PostHog indisponível");
      },
      context,
    });

    expect(() => analytics.whatsappClicked(validInputs.whatsappClicked)).not.toThrow();
  });
});

describe("adaptador de analytics do servidor", () => {
  test("envia identidade fora de propriedades e encerra o cliente", async () => {
    const capture = mock(
      (_input: { distinctId: string; event: string; properties: Record<string, unknown> }) =>
        undefined
    );
    const shutdown = mock(async () => undefined);
    const reportError = mock(() => undefined);
    const analytics = createServerAnalytics({
      enabled: true,
      context,
      createClient: () => ({ capture, shutdown }),
      reportError,
    });

    await analytics.productCreated({ distinctId: "user-interno" }, validInputs.productCreated);

    expect(capture).toHaveBeenCalledWith({
      distinctId: "user-interno",
      event: "product_created",
      properties: expect.objectContaining({ store_id: storeId, product_id: productId }),
    });
    expect(capture.mock.calls[0]?.[0].properties).not.toHaveProperty("distinct_id");
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(reportError).not.toHaveBeenCalled();
  });

  test("permanece noop quando desabilitado ou em produção", async () => {
    const createClient = mock(() => null);
    const reportError = mock(() => undefined);
    const disabled = createServerAnalytics({ enabled: false, context, createClient, reportError });
    const production = createServerAnalytics({
      enabled: true,
      context: { environment: "production", release: null },
      createClient,
      reportError,
    });

    await disabled.storeCreated({ distinctId: "user" }, validInputs.storeCreated);
    await production.storeCreated({ distinctId: "user" }, validInputs.storeCreated);

    expect(createClient).not.toHaveBeenCalled();
  });

  test("relata falha sem alterar o resultado da operação", async () => {
    const error = new Error("PostHog indisponível");
    const reportError = mock(() => undefined);
    const shutdown = mock(async () => undefined);
    const analytics = createServerAnalytics({
      enabled: true,
      context,
      createClient: () => ({
        capture: () => {
          throw error;
        },
        shutdown,
      }),
      reportError,
    });

    await expect(
      analytics.subscriptionStarted({ distinctId: "user" }, validInputs.subscriptionStarted)
    ).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(error, "subscription_started");
    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});
