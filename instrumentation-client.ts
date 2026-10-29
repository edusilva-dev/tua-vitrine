import posthog from "posthog-js";
import {
  createBrowserPostHogOptions,
  parseBrowserPostHogConfig,
  shouldInitializeBrowserPostHog,
} from "@/modules/observability/client/posthog";

try {
  const config = parseBrowserPostHogConfig({
    projectToken: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    environment: process.env.NEXT_PUBLIC_APP_ENV,
  });

  if (
    config &&
    shouldInitializeBrowserPostHog(config, {
      nodeEnv: process.env.NODE_ENV,
      disabled: process.env.NEXT_PUBLIC_POSTHOG_DISABLED,
    })
  ) {
    posthog.init(config.projectToken, createBrowserPostHogOptions(config));
    posthog.register({ environment: config.environment });
  }
} catch (error) {
  globalThis.reportError(error);
}
