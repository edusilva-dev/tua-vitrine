import { describe, expect, mock, test } from "bun:test";
import {
  createClientAnalytics,
  hasAnalyticsConsent,
} from "@/modules/observability/client/analytics";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_VERSION,
  readAnalyticsConsent,
} from "@/modules/observability/client/consent";
import { createAnalyticsConsentController } from "@/modules/observability/client/posthog-consent";
import {
  analyticsEventSchemas,
  analyticsEvents,
  createAnalyticsStoreGroup,
  type ProductCreatedInput,
} from "@/modules/observability/contracts/events";
import { createServerAnalytics } from "@/modules/observability/server/analytics";

const storeId = "11111111-1111-4111-8111-111111111111";
const secondStoreId = "33333333-3333-4333-8333-333333333333";
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

  test("limita o grupo de loja a propriedades seguras", () => {
    expect(
      createAnalyticsStoreGroup({
        storeId,
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        onboardingStep: 4,
      })
    ).toEqual({
      type: "store",
      key: storeId,
      properties: {
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        onboarding_step: 4,
      },
    });

    expect(() =>
      createAnalyticsStoreGroup({
        storeId,
        plan: "FREE",
        status: "DRAFT",
        onboardingStep: 1,
        name: "Loja que não pode sair do produto",
      } as Parameters<typeof createAnalyticsStoreGroup>[0])
    ).toThrow();
  });
});

describe("adaptador de analytics do browser", () => {
  test("exige opt-in explícito em todos os ambientes", () => {
    expect(hasAnalyticsConsent(() => false)).toBe(false);
    expect(hasAnalyticsConsent(() => true)).toBe(true);
  });

  test("trata preferência ausente, inválida ou de outra versão como desconhecida", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(readAnalyticsConsent(storage)).toBe("unknown");

    values.set(ANALYTICS_CONSENT_STORAGE_KEY, "conteúdo inválido");
    expect(readAnalyticsConsent(storage)).toBe("unknown");

    values.set(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: ANALYTICS_CONSENT_VERSION - 1, state: "accepted" })
    );
    expect(readAnalyticsConsent(storage)).toBe("unknown");
  });

  test("aceita sem reload e revoga limpando a identidade antes de desativar", () => {
    const values = new Map<string, string>();
    const order: string[] = [];
    const changes: string[] = [];
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const controller = createAnalyticsConsentController({
      storage,
      initialize: () => {
        order.push("initialize");

        return true;
      },
      resetAnalytics: () => order.push("reset"),
      sdk: {
        optIn: () => order.push("opt-in"),
        optOut: () => order.push("opt-out"),
      },
      emitChange: (state) => changes.push(state),
    });

    expect(controller.restore()).toBe("unknown");

    controller.accept();
    expect(readAnalyticsConsent(storage)).toBe("accepted");
    expect(order).toEqual(["initialize", "opt-in"]);

    controller.reject();
    expect(readAnalyticsConsent(storage)).toBe("rejected");
    expect(order).toEqual(["initialize", "opt-in", "reset", "opt-out"]);
    expect(changes).toEqual(["accepted", "rejected"]);
  });

  test("identifica de forma idempotente e preserva a sessão anônima", () => {
    let distinctId = "anonymous-session";
    let identifiedUserId: string | undefined;
    const identify = mock((userId: string) => {
      distinctId = userId;
      identifiedUserId = userId;
    });
    const reset = mock(() => {
      distinctId = "next-anonymous-session";
      identifiedUserId = undefined;
    });
    const analytics = createClientAnalytics({
      enabled: true,
      hasConsent: () => true,
      capture: () => undefined,
      identity: {
        getDistinctId: () => distinctId,
        getIdentifiedUserId: () => identifiedUserId,
        identify,
        reset,
      },
      context,
    });

    analytics.identify("user-internal-a");
    analytics.identify("user-internal-a");
    analytics.identify("user-internal-b");

    expect(identify.mock.calls).toEqual([["user-internal-a"], ["user-internal-b"]]);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  test("não identifica sem consentimento e limpa a identidade após logout", () => {
    const identify = mock(() => undefined);
    const reset = mock(() => undefined);
    const analytics = createClientAnalytics({
      enabled: true,
      hasConsent: () => false,
      capture: () => undefined,
      identity: {
        getDistinctId: () => "anonymous-session",
        getIdentifiedUserId: () => undefined,
        identify,
        reset,
      },
      context,
    });

    analytics.identify("user-internal");
    analytics.reset();

    expect(identify).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  test("falhas de identidade não interferem em autenticação ou logout", () => {
    const analytics = createClientAnalytics({
      enabled: true,
      hasConsent: () => true,
      capture: () => undefined,
      identity: {
        getDistinctId: () => {
          throw new Error("PostHog indisponível");
        },
        getIdentifiedUserId: () => undefined,
        identify: () => {
          throw new Error("PostHog indisponível");
        },
        reset: () => {
          throw new Error("PostHog indisponível");
        },
      },
      context,
    });

    expect(() => analytics.identify("user-internal")).not.toThrow();
    expect(() => analytics.reset()).not.toThrow();
  });

  test("associa e atualiza a loja sem alterar a identidade da pessoa", () => {
    const identify = mock(() => undefined);
    const group = mock(
      (_type: "store", _key: string, _properties: Record<string, unknown>) => undefined
    );
    const analytics = createClientAnalytics({
      enabled: true,
      hasConsent: () => true,
      capture: () => undefined,
      group,
      identity: {
        getDistinctId: () => "user-internal",
        getIdentifiedUserId: () => "user-internal",
        identify,
        reset: () => undefined,
      },
      context,
    });
    const firstStore = {
      storeId,
      plan: "FREE" as const,
      status: "DRAFT" as const,
      onboardingStep: 2 as const,
    };

    analytics.identify("user-internal");
    analytics.groupStore(firstStore);
    analytics.groupStore(firstStore);
    analytics.reset();
    analytics.groupStore(firstStore);
    analytics.groupStore({
      storeId: secondStoreId,
      plan: "ESSENTIAL",
      status: "ACTIVE",
      onboardingStep: 4,
    });

    expect(identify).not.toHaveBeenCalled();
    expect(group.mock.calls).toEqual([
      ["store", storeId, { plan: "FREE", status: "DRAFT", onboarding_step: 2 }],
      ["store", storeId, { plan: "FREE", status: "DRAFT", onboarding_step: 2 }],
      ["store", secondStoreId, { plan: "ESSENTIAL", status: "ACTIVE", onboarding_step: 4 }],
    ]);
  });

  test("não associa loja sem consentimento", () => {
    const group = mock(
      (_type: "store", _key: string, _properties: Record<string, unknown>) => undefined
    );
    const analytics = createClientAnalytics({
      enabled: true,
      hasConsent: () => false,
      capture: () => undefined,
      group,
      context,
    });

    analytics.groupStore({
      storeId,
      plan: "FREE",
      status: "ACTIVE",
      onboardingStep: 4,
    });

    expect(group).not.toHaveBeenCalled();
  });

  test("captura somente com configuração e consentimento", () => {
    const capture = mock((_name: string, _properties: Record<string, unknown>) => undefined);
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
      (_input: {
        distinctId: string;
        event: string;
        groups?: { store: string };
        properties: Record<string, unknown>;
      }) => undefined
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
      groups: { store: storeId },
      properties: expect.objectContaining({ store_id: storeId, product_id: productId }),
    });
    expect(capture.mock.calls[0]?.[0].properties).not.toHaveProperty("distinct_id");
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(reportError).not.toHaveBeenCalled();
  });

  test("mantém eventos de duas lojas isolados pelo grupo", async () => {
    const capture = mock(
      (_input: {
        distinctId: string;
        event: string;
        groups?: { store: string };
        properties: Record<string, unknown>;
      }) => undefined
    );
    const analytics = createServerAnalytics({
      enabled: true,
      context,
      createClient: () => ({ capture, shutdown: async () => undefined }),
      reportError: () => undefined,
    });

    await analytics.productCreated({ distinctId: "user" }, validInputs.productCreated);
    await analytics.productCreated(
      { distinctId: "user" },
      { ...validInputs.productCreated, storeId: secondStoreId }
    );

    expect(capture.mock.calls.map(([input]) => input.groups)).toEqual([
      { store: storeId },
      { store: secondStoreId },
    ]);
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
