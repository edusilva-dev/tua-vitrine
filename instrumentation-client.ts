import * as Sentry from "@sentry/nextjs";
import { filterSentryEvent, sentryEnvironment, sentryTracesSampleRate } from "@/lib/sentry-options";
import { initializePostHog } from "@/modules/observability/client/posthog-consent";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: sentryEnvironment,
  tracesSampleRate: sentryTracesSampleRate,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },
  beforeSend: filterSentryEvent,
});

try {
  initializePostHog();
} catch (error) {
  Sentry.captureException(error);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
