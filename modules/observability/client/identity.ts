"use client";

import posthog from "posthog-js";
import {
  type BrowserPostHogRuntime,
  isBrowserPostHogEnabled,
} from "@/modules/observability/client/posthog";
import { analyticsUserIdSchema } from "@/modules/observability/contracts/identity";
import {
  type AnalyticsStoreGroup,
  analyticsStoreGroupSchema,
} from "@/modules/observability/contracts/store-group";

export interface BrowserIdentityProvider {
  identify(userId: string): void;
  group(storeId: string, properties: Omit<AnalyticsStoreGroup, "storeId">): void;
  reset(): void;
  hasConsent(): boolean;
}

export interface BrowserIdentityOptions {
  provider: BrowserIdentityProvider;
  enabled: boolean;
  strict?: boolean | undefined;
  reportError?(error: unknown): void;
}

export interface BrowserIdentity {
  identify(userId: string): boolean;
  group(store: AnalyticsStoreGroup): boolean;
  anonymize(): boolean;
  reset(): boolean;
}

function safelyReportError(reportError: ((error: unknown) => void) | undefined, error: unknown) {
  if (!reportError) return;

  try {
    reportError(error);
  } catch {
    return;
  }
}

export function createBrowserIdentity(options: BrowserIdentityOptions): BrowserIdentity {
  const strict = options.strict ?? process.env.NODE_ENV !== "production";
  let identifiedUserId: string | null = null;

  return {
    identify(userId) {
      if (!options.enabled) return false;

      try {
        if (!options.provider.hasConsent()) return false;
      } catch (error) {
        safelyReportError(options.reportError, error);

        return false;
      }

      const parsedUserId = analyticsUserIdSchema.safeParse(userId);

      if (!parsedUserId.success) {
        if (strict) throw parsedUserId.error;

        return false;
      }

      try {
        options.provider.identify(parsedUserId.data);
        identifiedUserId = parsedUserId.data;

        return true;
      } catch (error) {
        safelyReportError(options.reportError, error);

        return false;
      }
    },
    group(store) {
      if (!options.enabled) return false;

      try {
        if (!options.provider.hasConsent()) return false;
      } catch (error) {
        safelyReportError(options.reportError, error);

        return false;
      }

      const parsed = analyticsStoreGroupSchema.safeParse(store);

      if (!parsed.success) {
        if (strict) throw parsed.error;

        return false;
      }

      const { storeId, ...properties } = parsed.data;

      try {
        options.provider.group(storeId, properties);

        return true;
      } catch (error) {
        safelyReportError(options.reportError, error);

        return false;
      }
    },
    anonymize() {
      if (!identifiedUserId) return true;

      try {
        options.provider.reset();
        identifiedUserId = null;

        return true;
      } catch (error) {
        safelyReportError(options.reportError, error);

        return false;
      }
    },
    reset() {
      try {
        options.provider.reset();
        identifiedUserId = null;

        return true;
      } catch (error) {
        safelyReportError(options.reportError, error);

        return false;
      }
    },
  };
}

const runtime: BrowserPostHogRuntime = {
  projectToken: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  nodeEnv: process.env.NODE_ENV,
  disabled: process.env.NEXT_PUBLIC_POSTHOG_DISABLED,
};

export const analyticsIdentity = createBrowserIdentity({
  provider: {
    identify: (userId) => posthog.identify(userId),
    group: (storeId, properties) => posthog.group("store", storeId, properties),
    reset: () => posthog.reset(),
    hasConsent: () => posthog.has_opted_in_capturing(),
  },
  enabled: isBrowserPostHogEnabled(runtime),
  reportError: (error) => globalThis.reportError(error),
});
