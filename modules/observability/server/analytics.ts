import "server-only";
import { z } from "zod";
import { logger } from "@/lib/server/logger";
import {
  type AccountCreatedPayload,
  type AnalyticsEventDefinition,
  type AnalyticsProperties,
  observabilityEvents,
  type ProductCreatedPayload,
  type ProductDeletedPayload,
  prepareAnalyticsEvent,
  type StoreCreatedPayload,
  type StorePublishedPayload,
  type SubscriptionCancelledPayload,
  type SubscriptionStartedPayload,
} from "@/modules/observability/contracts/events";
import { analyticsUserIdSchema } from "@/modules/observability/contracts/identity";
import { getPostHogServer } from "@/modules/observability/server/posthog";

export interface ServerAnalyticsIdentity {
  distinctId: string;
}

export interface ServerAnalyticsMessage {
  distinctId: string;
  event: string;
  properties: AnalyticsProperties;
  groups?: { store: string };
}

export interface ServerAnalyticsClient {
  capture(message: ServerAnalyticsMessage): void;
}

export interface ServerAnalyticsRuntime {
  client: ServerAnalyticsClient;
  environment: "development" | "staging";
  release: string;
}

export interface ServerAnalyticsOptions {
  getRuntime(): ServerAnalyticsRuntime | null;
  strict?: boolean | undefined;
  reportError?(error: unknown, eventName: string): void;
}

export interface ServerAnalytics {
  accountCreated(identity: ServerAnalyticsIdentity, payload: AccountCreatedPayload): void;
  storeCreated(identity: ServerAnalyticsIdentity, payload: StoreCreatedPayload): void;
  storePublished(identity: ServerAnalyticsIdentity, payload: StorePublishedPayload): void;
  productCreated(identity: ServerAnalyticsIdentity, payload: ProductCreatedPayload): void;
  productDeleted(identity: ServerAnalyticsIdentity, payload: ProductDeletedPayload): void;
  subscriptionStarted(identity: ServerAnalyticsIdentity, payload: SubscriptionStartedPayload): void;
  subscriptionCancelled(
    identity: ServerAnalyticsIdentity,
    payload: SubscriptionCancelledPayload
  ): void;
}

const identitySchema = z.strictObject({
  distinctId: analyticsUserIdSchema,
});

function safelyReportError(
  reportError: ((error: unknown, eventName: string) => void) | undefined,
  error: unknown,
  eventName: string
) {
  if (!reportError) return;

  try {
    reportError(error, eventName);
  } catch {
    return;
  }
}

export function createServerAnalytics(options: ServerAnalyticsOptions): ServerAnalytics {
  const strict = options.strict ?? process.env.NODE_ENV !== "production";

  function capture<Payload>(
    definition: AnalyticsEventDefinition<Payload>,
    identity: ServerAnalyticsIdentity,
    payload: Payload
  ) {
    let runtime: ServerAnalyticsRuntime | null;

    try {
      runtime = options.getRuntime();
    } catch (error) {
      safelyReportError(options.reportError, error, definition.name);

      return;
    }

    if (!runtime) return;

    const parsedIdentity = identitySchema.safeParse(identity);

    if (!parsedIdentity.success) {
      if (strict) throw parsedIdentity.error;

      return;
    }

    const event = prepareAnalyticsEvent(
      definition,
      payload,
      { environment: runtime.environment, release: runtime.release },
      strict
    );

    if (!event) return;

    try {
      const storeId = event.properties.store_id;

      runtime.client.capture({
        distinctId: parsedIdentity.data.distinctId,
        event: event.name,
        properties: event.properties,
        ...(typeof storeId === "string" ? { groups: { store: storeId } } : {}),
      });
    } catch (error) {
      safelyReportError(options.reportError, error, event.name);
    }
  }

  return {
    accountCreated: (identity, payload) =>
      capture(observabilityEvents.accountCreated, identity, payload),
    storeCreated: (identity, payload) =>
      capture(observabilityEvents.storeCreated, identity, payload),
    storePublished: (identity, payload) =>
      capture(observabilityEvents.storePublished, identity, payload),
    productCreated: (identity, payload) =>
      capture(observabilityEvents.productCreated, identity, payload),
    productDeleted: (identity, payload) =>
      capture(observabilityEvents.productDeleted, identity, payload),
    subscriptionStarted: (identity, payload) =>
      capture(observabilityEvents.subscriptionStarted, identity, payload),
    subscriptionCancelled: (identity, payload) =>
      capture(observabilityEvents.subscriptionCancelled, identity, payload),
  };
}

export const analytics = createServerAnalytics({
  getRuntime: getPostHogServer,
  reportError: (error, eventName) =>
    logger.error({ err: error, eventName }, "Falha na captura de telemetria do produto."),
});
