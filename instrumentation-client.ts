import {
  initializeBrowserAnalyticsConsent,
  stopBrowserReplay,
} from "@/modules/observability/client/browser-consent";
import { replayAllowedPath } from "@/modules/observability/client/posthog";

initializeBrowserAnalyticsConsent();

export function onRouterTransitionStart(url: string) {
  if (!replayAllowedPath(new URL(url, window.location.origin).pathname)) stopBrowserReplay();
}
