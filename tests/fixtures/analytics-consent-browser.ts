export { analytics } from "@/modules/observability/client/analytics";

export {
  browserAnalyticsConsent,
  initializeBrowserAnalyticsConsent,
} from "@/modules/observability/client/browser-consent";

export { analyticsIdentity } from "@/modules/observability/client/identity";

import posthog from "posthog-js";

export function shutdownBrowserAnalyticsProbe() {
  return posthog.shutdown();
}
