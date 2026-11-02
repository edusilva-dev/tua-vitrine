"use client";

import posthog from "posthog-js";
import { browserAnalyticsConsent } from "@/modules/observability/client/browser-consent";
import {
  type BrowserPostHogRuntime,
  isBrowserPostHogEnabled,
} from "@/modules/observability/client/posthog";
import {
  type AnalyticsEventDefinition,
  type AnalyticsProperties,
  type CatalogViewedPayload,
  observabilityEvents,
  type ProductCreationStartedPayload,
  type ProductViewedPayload,
  prepareAnalyticsEvent,
  type WhatsappClickedPayload,
} from "@/modules/observability/contracts/events";

export interface BrowserAnalyticsClient {
  capture(eventName: string, properties: AnalyticsProperties, groups: { store: string }): unknown;
}

export interface BrowserAnalyticsOptions {
  client: BrowserAnalyticsClient;
  enabled: boolean;
  environment?: "development" | "staging" | undefined;
  release: string | null;
  hasConsent(): boolean;
  strict?: boolean | undefined;
  reportError?(error: unknown): void;
}

export interface BrowserAnalytics {
  productCreationStarted(payload: ProductCreationStartedPayload): void;
  catalogViewed(payload: CatalogViewedPayload): void;
  productViewed(payload: ProductViewedPayload): void;
  whatsappClicked(payload: WhatsappClickedPayload): void;
}

function safelyReportError(reportError: ((error: unknown) => void) | undefined, error: unknown) {
  if (!reportError) return;

  try {
    reportError(error);
  } catch {
    return;
  }
}

export function createBrowserAnalytics(options: BrowserAnalyticsOptions): BrowserAnalytics {
  const strict = options.strict ?? process.env.NODE_ENV !== "production";

  function capture<Payload>(definition: AnalyticsEventDefinition<Payload>, payload: Payload) {
    if (!options.enabled || !options.environment) return;

    try {
      if (!options.hasConsent()) return;
    } catch (error) {
      safelyReportError(options.reportError, error);

      return;
    }

    const event = prepareAnalyticsEvent(
      definition,
      payload,
      { environment: options.environment, release: options.release },
      strict
    );

    if (!event) return;

    try {
      const storeId = event.properties.store_id;

      if (typeof storeId !== "string") return;

      options.client.capture(event.name, event.properties, { store: storeId });
    } catch (error) {
      safelyReportError(options.reportError, error);
    }
  }

  return {
    productCreationStarted: (payload) =>
      capture(observabilityEvents.productCreationStarted, payload),
    catalogViewed: (payload) => capture(observabilityEvents.catalogViewed, payload),
    productViewed: (payload) => capture(observabilityEvents.productViewed, payload),
    whatsappClicked: (payload) => capture(observabilityEvents.whatsappClicked, payload),
  };
}

const runtime: BrowserPostHogRuntime = {
  projectToken: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  nodeEnv: process.env.NODE_ENV,
  disabled: process.env.NEXT_PUBLIC_POSTHOG_DISABLED,
};
const enabled = isBrowserPostHogEnabled(runtime);

export const analytics = createBrowserAnalytics({
  client: {
    capture: (eventName, properties, groups) =>
      posthog.capture(eventName, { ...properties, $groups: groups }),
  },
  enabled,
  environment: enabled ? runtime.environment : undefined,
  release: null,
  hasConsent: () => browserAnalyticsConsent.hasConsent(),
  reportError: (error) => globalThis.reportError(error),
});
