"use client";

import posthog from "posthog-js";
import {
  type AccountCreatedInput,
  type AnalyticsRuntimeContext,
  type AnalyticsStoreGroupInput,
  analyticsEnvironmentSchema,
  analyticsEvents,
  type CatalogViewedInput,
  createAnalyticsStoreGroup,
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

type ClientCapture = (name: string, properties: Record<string, unknown>) => unknown;

type ClientIdentity = {
  getDistinctId: () => string;
  getIdentifiedUserId: () => string | undefined;
  identify: (distinctId: string) => unknown;
  reset: () => unknown;
};

type ClientAnalyticsOptions = {
  enabled: boolean;
  hasConsent: () => boolean;
  capture: ClientCapture;
  context: AnalyticsRuntimeContext;
  group?: (type: "store", key: string, properties: Record<string, unknown>) => unknown;
  identity?: ClientIdentity;
};

type EventFactory<TInput> = (
  input: TInput,
  context: AnalyticsRuntimeContext
) => ReturnType<(typeof analyticsEvents)[keyof typeof analyticsEvents]>;

export function hasAnalyticsConsent(
  environment: AnalyticsRuntimeContext["environment"],
  hasOptedIn: () => boolean
): boolean {
  return environment !== "production" || hasOptedIn();
}

export function createClientAnalytics(options: ClientAnalyticsOptions) {
  let currentStoreGroup: string | null = null;

  function send<TInput>(factory: EventFactory<TInput>, input: TInput): void {
    if (!options.enabled || !options.hasConsent()) return;

    let event: ReturnType<EventFactory<TInput>>;

    try {
      event = factory(input, options.context);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") throw error;

      return;
    }

    if (!event) return;

    try {
      options.capture(event.name, event.properties);
    } catch {
      // Analytics is best-effort and must never interrupt the user flow.
    }
  }

  return {
    groupStore(input: AnalyticsStoreGroupInput) {
      if (!options.enabled || !options.hasConsent() || !options.group) return;

      try {
        const group = createAnalyticsStoreGroup(input);

        if (!group) return;

        const fingerprint = JSON.stringify([group.key, group.properties]);

        if (currentStoreGroup === fingerprint) return;

        options.group(group.type, group.key, group.properties);
        currentStoreGroup = fingerprint;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") throw error;
      }
    },
    identify(userId: string) {
      if (!options.enabled || !options.hasConsent() || !options.identity || !userId.trim()) return;

      try {
        if (options.identity.getDistinctId() === userId) return;

        const identifiedUserId = options.identity.getIdentifiedUserId();

        if (identifiedUserId && identifiedUserId !== userId) {
          options.identity.reset();
          currentStoreGroup = null;
        }

        options.identity.identify(userId);
      } catch {
        // Identity is best-effort and must never interrupt authentication.
      }
    },
    reset() {
      if (!options.enabled || !options.identity) return;

      try {
        options.identity.reset();
        currentStoreGroup = null;
      } catch {
        // Logout must complete even when analytics is unavailable.
      }
    },
    landingPageViewed(input: LandingPageViewedInput) {
      send(analyticsEvents.landingPageViewed, input);
    },
    landingCtaClicked(input: LandingCtaClickedInput) {
      send(analyticsEvents.landingCtaClicked, input);
    },
    accountCreated(input: AccountCreatedInput) {
      send(analyticsEvents.accountCreated, input);
    },
    storeCreated(input: StoreCreatedInput) {
      send(analyticsEvents.storeCreated, input);
    },
    storePublished(input: StorePublishedInput) {
      send(analyticsEvents.storePublished, input);
    },
    productCreationStarted(input: ProductCreationStartedInput) {
      send(analyticsEvents.productCreationStarted, input);
    },
    productCreated(input: ProductCreatedInput) {
      send(analyticsEvents.productCreated, input);
    },
    productDeleted(input: ProductDeletedInput) {
      send(analyticsEvents.productDeleted, input);
    },
    catalogViewed(input: CatalogViewedInput) {
      send(analyticsEvents.catalogViewed, input);
    },
    productViewed(input: ProductViewedInput) {
      send(analyticsEvents.productViewed, input);
    },
    whatsappClicked(input: WhatsappClickedInput) {
      send(analyticsEvents.whatsappClicked, input);
    },
    subscriptionStarted(input: SubscriptionStartedInput) {
      send(analyticsEvents.subscriptionStarted, input);
    },
    subscriptionCancelled(input: SubscriptionCancelledInput) {
      send(analyticsEvents.subscriptionCancelled, input);
    },
  };
}

const environment = analyticsEnvironmentSchema.safeParse(process.env.NEXT_PUBLIC_APP_ENV);
const enabled = Boolean(
  environment.success &&
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST &&
    process.env.NODE_ENV !== "test"
);

export const analytics = createClientAnalytics({
  enabled,
  hasConsent: () =>
    environment.success &&
    hasAnalyticsConsent(environment.data, () => posthog.has_opted_in_capturing()),
  capture: (name, properties) => posthog.capture(name, properties),
  group: (type, key, properties) => posthog.group(type, key, properties),
  identity: {
    getDistinctId: () => posthog.get_distinct_id(),
    getIdentifiedUserId: () => {
      const userId = posthog.get_property("$user_id");

      return typeof userId === "string" ? userId : undefined;
    },
    identify: (distinctId) => posthog.identify(distinctId),
    reset: () => posthog.reset(),
  },
  context: {
    environment: environment.success ? environment.data : "development",
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() || null,
  },
});
