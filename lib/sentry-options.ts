import type { ErrorEvent, EventHint } from "@sentry/nextjs";

export const sentryEnvironment =
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV;

export const sentryTracesSampleRate = sentryEnvironment === "production" ? 0.1 : 1;

export function filterSentryEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;

    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
    }
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  return event;
}
