"use client";

import posthog from "posthog-js";
import {
  ANALYTICS_CONSENT_KEY,
  createAnalyticsConsent,
} from "@/modules/observability/client/consent";
import {
  createBrowserPostHogOptions,
  isBrowserPostHogEnabled,
} from "@/modules/observability/client/posthog";

const runtime = {
  projectToken: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  nodeEnv: process.env.NODE_ENV,
  disabled: process.env.NEXT_PUBLIC_POSTHOG_DISABLED,
};

export const browserAnalyticsConsent = createAnalyticsConsent({
  enabled: isBrowserPostHogEnabled(runtime),
  storage: {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  },
  provider: {
    initialize() {
      if (!isBrowserPostHogEnabled(runtime)) return;

      posthog.init(runtime.projectToken, createBrowserPostHogOptions(runtime));
    },
    optIn() {
      posthog.opt_in_capturing({ captureEventName: false });
      posthog.register({ environment: runtime.environment });
    },
    optOut: () => posthog.opt_out_capturing(),
    reset: () => posthog.reset(true),
    clearConsent: () => posthog.clear_opt_in_out_capturing(),
    hasConsent: () => posthog.has_opted_in_capturing(),
  },
  reportError: (error) => globalThis.reportError(error),
});

export function initializeBrowserAnalyticsConsent() {
  browserAnalyticsConsent.start();
  window.addEventListener("storage", (event) => {
    if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) {
      browserAnalyticsConsent.restore();
    }
  });
}
