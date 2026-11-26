import "server-only";
import { getEnv } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";
import {
  type AccountCreatedInput,
  type AnalyticsRuntimeContext,
  analyticsEvents,
  type CatalogViewedInput,
  type LandingCtaClickedInput,
  type LandingPageViewedInput,
  type ProductCreatedInput,
  type ProductCreationStartedInput,
  type ProductDeletedInput,
  type ProductViewedInput,
  type StoreCreatedInput,
  type StorePublishedInput,
  type SubscriptionCancelledInput,
  type SubscriptionStartedInput,
  type WhatsappClickedInput,
} from "../contracts/events";
import { createPostHogServer } from "./posthog";

type ServerAnalyticsIdentity = {
  distinctId: string;
};

type ServerPostHogClient = {
  capture(input: {
    distinctId: string;
    event: string;
    properties: Record<string, unknown>;
  }): unknown;
  shutdown(): Promise<void>;
};

type ServerAnalyticsOptions = {
  enabled: boolean;
  context: AnalyticsRuntimeContext;
  createClient: () => ServerPostHogClient | null;
  reportError: (error: unknown, event: string) => void;
};

type EventFactory<TInput> = (
  input: TInput,
  context: AnalyticsRuntimeContext
) => ReturnType<(typeof analyticsEvents)[keyof typeof analyticsEvents]>;

export function createServerAnalytics(options: ServerAnalyticsOptions) {
  async function send<TInput>(
    identity: ServerAnalyticsIdentity,
    factory: EventFactory<TInput>,
    input: TInput
  ): Promise<void> {
    if (!options.enabled || options.context.environment === "production") return;

    let event: ReturnType<EventFactory<TInput>>;

    try {
      event = factory(input, options.context);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") throw error;

      options.reportError(error, "invalid_event");

      return;
    }

    if (!event) return;

    const client = options.createClient();

    if (!client) return;

    let providerError: unknown;

    try {
      await client.capture({
        distinctId: identity.distinctId,
        event: event.name,
        properties: event.properties,
      });
    } catch (error) {
      providerError = error;
    }

    try {
      await client.shutdown();
    } catch (error) {
      providerError ??= error;
    }

    if (providerError) options.reportError(providerError, event.name);
  }

  return {
    landingPageViewed(identity: ServerAnalyticsIdentity, input: LandingPageViewedInput) {
      return send(identity, analyticsEvents.landingPageViewed, input);
    },
    landingCtaClicked(identity: ServerAnalyticsIdentity, input: LandingCtaClickedInput) {
      return send(identity, analyticsEvents.landingCtaClicked, input);
    },
    accountCreated(identity: ServerAnalyticsIdentity, input: AccountCreatedInput) {
      return send(identity, analyticsEvents.accountCreated, input);
    },
    storeCreated(identity: ServerAnalyticsIdentity, input: StoreCreatedInput) {
      return send(identity, analyticsEvents.storeCreated, input);
    },
    storePublished(identity: ServerAnalyticsIdentity, input: StorePublishedInput) {
      return send(identity, analyticsEvents.storePublished, input);
    },
    productCreationStarted(identity: ServerAnalyticsIdentity, input: ProductCreationStartedInput) {
      return send(identity, analyticsEvents.productCreationStarted, input);
    },
    productCreated(identity: ServerAnalyticsIdentity, input: ProductCreatedInput) {
      return send(identity, analyticsEvents.productCreated, input);
    },
    productDeleted(identity: ServerAnalyticsIdentity, input: ProductDeletedInput) {
      return send(identity, analyticsEvents.productDeleted, input);
    },
    catalogViewed(identity: ServerAnalyticsIdentity, input: CatalogViewedInput) {
      return send(identity, analyticsEvents.catalogViewed, input);
    },
    productViewed(identity: ServerAnalyticsIdentity, input: ProductViewedInput) {
      return send(identity, analyticsEvents.productViewed, input);
    },
    whatsappClicked(identity: ServerAnalyticsIdentity, input: WhatsappClickedInput) {
      return send(identity, analyticsEvents.whatsappClicked, input);
    },
    subscriptionStarted(identity: ServerAnalyticsIdentity, input: SubscriptionStartedInput) {
      return send(identity, analyticsEvents.subscriptionStarted, input);
    },
    subscriptionCancelled(identity: ServerAnalyticsIdentity, input: SubscriptionCancelledInput) {
      return send(identity, analyticsEvents.subscriptionCancelled, input);
    },
  };
}

export function getServerAnalytics() {
  const env = getEnv();

  return createServerAnalytics({
    enabled: env.POSTHOG_SERVER_ENABLED,
    context: {
      environment: env.NEXT_PUBLIC_APP_ENV ?? "development",
      release: env.APP_RELEASE ?? null,
    },
    createClient: createPostHogServer,
    reportError(error, event) {
      logger.warn({ err: error, event }, "Falha ao enviar evento de analytics.");
    },
  });
}
