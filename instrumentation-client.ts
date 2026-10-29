import posthog from "posthog-js";
import {
  createBrowserPostHogOptions,
  parseBrowserPostHogConfig,
  shouldInitializeBrowserPostHog,
} from "@/modules/observability/config";

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
  // biome-ignore lint/suspicious/noConsole: instrumentation failures must remain visible without breaking hydration.
  console.error("[observability] PostHog do browser não foi inicializado.", error);
}
