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

let requestGeneration = 0;

function isRetryQueue(
  value: unknown
): value is { retriableRequest: typeof posthog._send_retriable_request } {
  return (
    typeof value === "object" &&
    value !== null &&
    "retriableRequest" in value &&
    typeof value.retriableRequest === "function"
  );
}

function guardPostHogRequests(instance: typeof posthog) {
  // The production bundle minifies the queue's field name. Find it by its
  // method, rather than depending on `_retryQueue` from the unminified sources.
  const retryQueue = Object.values(instance).find(isRetryQueue);

  if (!retryQueue) throw new Error("O PostHog não oferece o controle de envio esperado.");

  // posthog-js 1.442.1 has no public retry cancellation. Its RetryQueue copies
  // requests but retains their data object; unload bypasses retriableRequest.
  // Keep this compatibility guard inside the adapter and verify both paths on upgrades.
  const generations = new WeakMap<object, number>();
  const retry = retryQueue.retriableRequest.bind(retryQueue);
  const send = instance._send_request.bind(instance);

  function maySend(request: Parameters<typeof posthog._send_request>[0]) {
    const payload =
      typeof request.data === "object" && request.data !== null ? request.data : request;
    let generation = generations.get(payload);

    if (generation === undefined) {
      generation = requestGeneration;
      generations.set(payload, generation);
    }

    return browserAnalyticsConsent.hasConsent() && generation === requestGeneration;
  }

  retryQueue.retriableRequest = (request, transport) => {
    if (!maySend(request)) return;

    // Synchronous encoding keeps dispatch in the same consent check, without
    // awaiting CompressionStream work that could finish after revocation.
    retry({ ...request, preferSyncCompression: true }, transport);
  };
  instance._send_request = (request) => {
    if (!maySend(request)) return;

    send({ ...request, preferSyncCompression: true });
  };
}

export const browserAnalyticsConsent = createAnalyticsConsent({
  enabled: isBrowserPostHogEnabled(runtime),
  storage: {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  },
  provider: {
    initialize() {
      if (!isBrowserPostHogEnabled(runtime)) return;

      const instance = posthog.init(runtime.projectToken, createBrowserPostHogOptions(runtime));

      guardPostHogRequests(instance);
    },
    optIn() {
      posthog.opt_in_capturing({ captureEventName: false });
      posthog.register({ environment: runtime.environment });
    },
    optOut: () => posthog.opt_out_capturing(),
    reset() {
      requestGeneration += 1;
      posthog.reset(true);
    },
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
