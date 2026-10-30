export type AnalyticsConsentStatus = "unknown" | "accepted" | "rejected";

export const ANALYTICS_CONSENT_KEY = "tua-vitrine:analytics-consent";

export const ANALYTICS_CONSENT_VERSION = 1;

export interface AnalyticsConsentSnapshot {
  status: AnalyticsConsentStatus;
  persisted: boolean;
  revision: number;
}

export interface AnalyticsConsentProvider {
  initialize(): void;
  optIn(): void;
  optOut(): void;
  reset(): void;
  clearConsent(): void;
  hasConsent(): boolean;
}

export interface AnalyticsConsentOptions {
  enabled: boolean;
  provider: AnalyticsConsentProvider;
  storage: Pick<Storage, "getItem" | "setItem">;
  reportError?(error: unknown): void;
}

export const unknownAnalyticsConsent: AnalyticsConsentSnapshot = {
  status: "unknown",
  persisted: true,
  revision: 0,
};

export function parseAnalyticsConsent(value: string | null): AnalyticsConsentStatus {
  if (!value) return "unknown";

  try {
    const preference: unknown = JSON.parse(value);

    if (
      typeof preference === "object" &&
      preference !== null &&
      "version" in preference &&
      preference.version === ANALYTICS_CONSENT_VERSION &&
      "status" in preference &&
      (preference.status === "accepted" || preference.status === "rejected")
    ) {
      return preference.status;
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

export function createAnalyticsConsent(options: AnalyticsConsentOptions) {
  let snapshot = unknownAnalyticsConsent;
  let initialized = false;
  let started = false;
  let capturing = false;
  const listeners = new Set<() => void>();

  function report(error: unknown) {
    try {
      options.reportError?.(error);
    } catch {
      return;
    }
  }

  function cleanup(action: () => void) {
    try {
      action();
    } catch (error) {
      report(error);
    }
  }

  function apply(status: AnalyticsConsentStatus) {
    capturing = false;

    if (!options.enabled) return;

    try {
      if (status === "accepted") {
        if (!initialized) {
          options.provider.initialize();
          initialized = true;
        }

        options.provider.optIn();
        capturing = options.provider.hasConsent();

        return;
      }

      if (!initialized) return;

      // Stop capture before resetting, then remove the SDK's own consent marker.
      // Its default is opted out; our versioned preference is the sole authority.
      cleanup(() => options.provider.optOut());
      cleanup(() => options.provider.reset());
      cleanup(() => options.provider.clearConsent());
    } catch (error) {
      report(error);
    }
  }

  function publish(status: AnalyticsConsentStatus, persisted: boolean) {
    snapshot = { status, persisted, revision: snapshot.revision + 1 };
    apply(status);

    for (const listener of listeners) listener();
  }

  function restore() {
    try {
      publish(parseAnalyticsConsent(options.storage.getItem(ANALYTICS_CONSENT_KEY)), true);
    } catch (error) {
      report(error);
      publish("unknown", false);
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    start() {
      if (started) return;

      started = true;
      restore();
    },
    restore,
    choose(status: "accepted" | "rejected") {
      let persisted = true;

      try {
        options.storage.setItem(
          ANALYTICS_CONSENT_KEY,
          JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, status })
        );
      } catch (error) {
        persisted = false;
        report(error);
      }

      publish(status, persisted);
    },
    hasConsent: () => snapshot.status === "accepted" && capturing,
    resetIdentity() {
      if (!initialized) return;

      capturing = false;
      options.provider.reset();
      apply(snapshot.status);
    },
  };
}
