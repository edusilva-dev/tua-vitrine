import * as Sentry from "@sentry/nextjs";
import { filterSentryEvent, sentryEnvironment, sentryTracesSampleRate } from "@/lib/sentry-options";

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
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
  beforeSend: filterSentryEvent,
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ["warn", "error", "fatal"] },
    }),
  ],
});
