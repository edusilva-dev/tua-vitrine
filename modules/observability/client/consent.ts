export const ANALYTICS_CONSENT_VERSION = 1;

export const ANALYTICS_CONSENT_STORAGE_KEY = "tuavitrine:analytics-consent";

export const ANALYTICS_CONSENT_CHANGED_EVENT = "tuavitrine:analytics-consent-changed";

export type AnalyticsConsentState = "unknown" | "accepted" | "rejected";

type StoredAnalyticsConsent = {
  version: number;
  state: Exclude<AnalyticsConsentState, "unknown">;
};

type ConsentStorage = Pick<Storage, "getItem" | "setItem">;

export function readAnalyticsConsent(storage: ConsentStorage): AnalyticsConsentState {
  try {
    const value = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);

    if (!value) return "unknown";

    const parsed = JSON.parse(value) as Partial<StoredAnalyticsConsent>;

    if (parsed.version !== ANALYTICS_CONSENT_VERSION) return "unknown";

    if (parsed.state !== "accepted" && parsed.state !== "rejected") return "unknown";

    return parsed.state;
  } catch {
    return "unknown";
  }
}

export function writeAnalyticsConsent(
  storage: ConsentStorage,
  state: Exclude<AnalyticsConsentState, "unknown">
): void {
  try {
    storage.setItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, state } satisfies StoredAnalyticsConsent)
    );
  } catch {
    // Storage restrictions must not interrupt the product.
  }
}
