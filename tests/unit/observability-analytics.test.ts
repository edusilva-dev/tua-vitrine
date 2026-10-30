import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import {
  type BrowserAnalyticsClient,
  createBrowserAnalytics,
} from "@/modules/observability/client/analytics";
import type { AnalyticsProperties } from "@/modules/observability/contracts/events";
import {
  createServerAnalytics,
  type ServerAnalyticsClient,
  type ServerAnalyticsMessage,
} from "@/modules/observability/server/analytics";

const userId = "better-auth-user_123";
const storeId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";

interface CapturedBrowserEvent {
  eventName: string;
  properties: AnalyticsProperties;
}

function createBrowserHarness(
  overrides: {
    enabled?: boolean;
    consent?: boolean;
    client?: BrowserAnalyticsClient;
    strict?: boolean;
  } = {}
) {
  const events: CapturedBrowserEvent[] = [];
  const client =
    overrides.client ??
    ({
      capture: (eventName, properties) => events.push({ eventName, properties }),
    } satisfies BrowserAnalyticsClient);
  const analytics = createBrowserAnalytics({
    client,
    enabled: overrides.enabled ?? true,
    environment: "staging",
    release: null,
    hasConsent: () => overrides.consent ?? true,
    strict: overrides.strict ?? true,
  });

  return { analytics, events };
}

function createServerHarness(
  overrides: { enabled?: boolean; client?: ServerAnalyticsClient; strict?: boolean } = {}
) {
  const events: ServerAnalyticsMessage[] = [];
  const client =
    overrides.client ??
    ({ capture: (message) => events.push(message) } satisfies ServerAnalyticsClient);
  const analytics = createServerAnalytics({
    getRuntime: () =>
      overrides.enabled === false
        ? null
        : { client, environment: "staging", release: "commit-abc123" },
    strict: overrides.strict ?? true,
  });

  return { analytics, events };
}

describe("wrapper de observabilidade do browser", () => {
  test("captura apenas os quatro eventos de interação com propriedades comuns", () => {
    const { analytics, events } = createBrowserHarness();

    analytics.productCreationStarted({ storeId });
    analytics.catalogViewed({ storeId, plan: "FREE" });
    analytics.productViewed({ storeId, productId });
    analytics.whatsappClicked({
      storeId,
      productId,
      location: "product_detail",
    });

    expect(events.map((event) => event.eventName)).toEqual([
      "product_creation_started",
      "catalog_viewed",
      "product_viewed",
      "whatsapp_clicked",
    ]);
    expect(events[0]?.properties).toEqual({
      schema_version: 1,
      environment: "staging",
      release: null,
      surface: "admin",
      source: "product_form",
      store_id: storeId,
    });
    expect(events[3]?.properties).toMatchObject({
      surface: "storefront",
      source: "storefront",
      store_id: storeId,
      product_id: productId,
      location: "product_detail",
    });
    expect(events[3]?.properties).not.toHaveProperty("cart_size");
    expect("capture" in analytics).toBe(false);
  });

  test("permanece noop sem consentimento ou quando desabilitado", () => {
    const withoutConsent = createBrowserHarness({ consent: false });
    const disabled = createBrowserHarness({ enabled: false });

    expect(() =>
      withoutConsent.analytics.productViewed({ storeId: "inválido", productId })
    ).not.toThrow();
    expect(() =>
      disabled.analytics.productViewed({ storeId: "inválido", productId })
    ).not.toThrow();
    expect(withoutConsent.events).toEqual([]);
    expect(disabled.events).toEqual([]);
  });

  test("rejeita propriedades desconhecidas ou pessoais antes de enviá-las", () => {
    const { analytics, events } = createBrowserHarness();
    const forbidden = {
      email: "nao-enviar@example.com",
      name: "Nome pessoal",
      phone: "+5511999999999",
      slug: "loja-exemplo",
      message: "conteúdo livre",
      description: "descrição do produto",
      searchTerm: "busca privada",
      url: "https://vitrine.example/produto?token=segredo",
      metadata: { arbitrary: true },
    };

    for (const [property, value] of Object.entries(forbidden)) {
      expect(() => analytics.productViewed({ storeId, productId, [property]: value })).toThrow();
    }

    expect(events).toEqual([]);
  });

  test("falha do fornecedor não altera o fluxo da aplicação", () => {
    const errors: unknown[] = [];
    const captureFailure = createBrowserAnalytics({
      client: {
        capture: () => {
          throw new Error("PostHog indisponível");
        },
      },
      enabled: true,
      environment: "development",
      release: null,
      hasConsent: () => true,
      reportError: (error) => errors.push(error),
    });
    const consentFailure = createBrowserAnalytics({
      client: { capture: () => undefined },
      enabled: true,
      environment: "development",
      release: null,
      hasConsent: () => {
        throw new Error("Estado de consentimento indisponível");
      },
      reportError: (error) => errors.push(error),
    });

    expect(() => captureFailure.catalogViewed({ storeId, plan: "FREE" })).not.toThrow();
    expect(() => consentFailure.catalogViewed({ storeId, plan: "FREE" })).not.toThrow();
    expect(errors).toHaveLength(2);
  });
});

describe("wrapper de observabilidade do servidor", () => {
  test("expõe os sete eventos de resultado com identidade fora das propriedades", () => {
    const { analytics, events } = createServerHarness();
    const identity = { distinctId: userId };

    analytics.accountCreated(identity, { signupPlan: "FREE" });
    analytics.storeCreated(identity, { storeId, plan: "FREE" });
    analytics.storePublished(identity, { storeId, plan: "FREE", productCount: 1 });
    analytics.productCreated(identity, {
      storeId,
      productId,
      creationMethod: "manual",
      isFirstProduct: true,
    });
    analytics.productDeleted(identity, { storeId, productCount: 0, operation: "single" });
    analytics.subscriptionStarted(identity, {
      storeId,
      plan: "PROFESSIONAL",
      billingStatus: "ACTIVE",
    });
    analytics.subscriptionCancelled(identity, {
      storeId,
      plan: "PROFESSIONAL",
      effectiveImmediately: false,
    });

    expect(events.map((event) => event.event)).toEqual([
      "account_created",
      "store_created",
      "store_published",
      "product_created",
      "product_deleted",
      "subscription_started",
      "subscription_cancelled",
    ]);
    expect(events[0]).toEqual({
      distinctId: userId,
      event: "account_created",
      properties: {
        schema_version: 1,
        environment: "staging",
        release: "commit-abc123",
        surface: "auth",
        source: "better_auth",
        signup_plan: "FREE",
      },
    });
    expect(events[3]?.properties).toMatchObject({
      store_id: storeId,
      product_id: productId,
      creation_method: "manual",
      is_first_product: true,
    });
    expect(events[0]?.properties).not.toHaveProperty("user_id");
    expect("capture" in analytics).toBe(false);
  });

  test("permanece noop sem runtime e descarta payload inválido em modo não estrito", () => {
    const disabled = createServerHarness({ enabled: false });
    const production = createServerHarness({ strict: false });

    expect(() =>
      disabled.analytics.storeCreated(
        { distinctId: "inválido" },
        { storeId: "inválido", plan: "FREE" }
      )
    ).not.toThrow();
    expect(() =>
      production.analytics.storeCreated(
        { distinctId: userId },
        { storeId: "inválido", plan: "FREE" }
      )
    ).not.toThrow();
    expect(disabled.events).toEqual([]);
    expect(production.events).toEqual([]);
  });

  test("aceita o ID opaco do Better Auth e recusa e-mail como identidade", () => {
    const { analytics, events } = createServerHarness();

    analytics.accountCreated({ distinctId: userId }, { signupPlan: "FREE" });
    expect(() =>
      analytics.accountCreated({ distinctId: "nao-usar-email@example.com" }, { signupPlan: "FREE" })
    ).toThrow(/ID interno/);
    expect(events).toHaveLength(1);
  });

  test("falha do fornecedor é reportada sem propagar a exceção", () => {
    const errors: unknown[] = [];
    const captureFailure = createServerAnalytics({
      getRuntime: () => ({
        client: {
          capture: () => {
            throw new Error("PostHog indisponível");
          },
        },
        environment: "development",
        release: "commit-abc123",
      }),
      reportError: (error) => errors.push(error),
    });
    const runtimeFailure = createServerAnalytics({
      getRuntime: () => {
        throw new Error("Runtime PostHog indisponível");
      },
      reportError: (error) => errors.push(error),
    });

    expect(() =>
      captureFailure.storeCreated({ distinctId: userId }, { storeId, plan: "FREE" })
    ).not.toThrow();
    expect(() =>
      runtimeFailure.storeCreated({ distinctId: userId }, { storeId, plan: "FREE" })
    ).not.toThrow();
    expect(errors).toHaveLength(2);
  });
});

describe("limite arquitetural dos SDKs do PostHog", () => {
  test("restringe imports diretos aos adaptadores e ao bootstrap", async () => {
    const allowed = new Set([
      "instrumentation-client.ts",
      "modules/observability/client/analytics.ts",
      "modules/observability/server/posthog.ts",
    ]);
    const imports: string[] = [];
    const glob = new Glob("{app,components,lib,modules,scripts}/**/*.{ts,tsx}");

    for await (const path of glob.scan({ cwd: process.cwd() })) {
      const source = await Bun.file(path).text();

      if (/["']posthog-(js|node)["']/.test(source)) imports.push(path);
    }

    const bootstrap = await Bun.file("instrumentation-client.ts").text();

    if (/["']posthog-(js|node)["']/.test(bootstrap)) imports.push("instrumentation-client.ts");

    expect(imports.sort()).toEqual([...allowed].sort());
  });
});
