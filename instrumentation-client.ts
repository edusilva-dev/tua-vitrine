import posthog from "posthog-js";
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

if (isBrowserPostHogEnabled(runtime)) {
  try {
    posthog.init(runtime.projectToken, createBrowserPostHogOptions(runtime));
    posthog.register({ environment: runtime.environment });
  } catch (error) {
    globalThis.reportError(error);
  }
}
