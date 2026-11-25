import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
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
    stackFrameVariables: false,
  },
  beforeSend: filterSentryEvent,
});

const postHogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const appEnvironment = process.env.NEXT_PUBLIC_APP_ENV;

if (postHogToken && postHogHost && appEnvironment) {
  try {
    posthog.init(postHogToken, {
      api_host: postHogHost,
      defaults: "2026-08-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      advanced_disable_flags: true,
      person_profiles: "identified_only",
      opt_out_capturing_by_default: appEnvironment === "production",
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
