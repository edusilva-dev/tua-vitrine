import "server-only";
import { PostHog } from "posthog-node";
import { getEnv } from "@/lib/server/env";

export function createPostHogServer() {
  const env = getEnv();

  if (!env.POSTHOG_SERVER_ENABLED || !env.POSTHOG_PROJECT_TOKEN || !env.POSTHOG_HOST) return null;

  return new PostHog(env.POSTHOG_PROJECT_TOKEN, {
    host: env.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}
