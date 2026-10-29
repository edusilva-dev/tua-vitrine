import "server-only";
import { PostHog } from "posthog-node";
import { getEnv } from "@/lib/server/env";

type PostHogServerState = {
  client: PostHog;
  environment: "development" | "staging";
  release: string;
};

const globalPostHog = globalThis as typeof globalThis & {
  __tuaVitrinePostHog?: PostHogServerState;
};

export function getPostHogServer(): PostHogServerState | null {
  const env = getEnv();
  const environment = env.NEXT_PUBLIC_APP_ENV;

  if (
    env.POSTHOG_DISABLED ||
    env.NODE_ENV === "test" ||
    (environment !== "development" && environment !== "staging") ||
    !env.POSTHOG_PROJECT_TOKEN ||
    !env.POSTHOG_HOST ||
    !env.APP_RELEASE
  )
    return null;

  if (!globalPostHog.__tuaVitrinePostHog) {
    globalPostHog.__tuaVitrinePostHog = {
      client: new PostHog(env.POSTHOG_PROJECT_TOKEN, {
        host: env.POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
        disableGeoip: true,
      }),
      environment,
      release: env.APP_RELEASE,
    };
  }

  return globalPostHog.__tuaVitrinePostHog ?? null;
}

export async function flushPostHogServer() {
  await globalPostHog.__tuaVitrinePostHog?.client.flush();
}

export async function shutdownPostHogServer() {
  const state = globalPostHog.__tuaVitrinePostHog;

  if (!state) return;

  delete globalPostHog.__tuaVitrinePostHog;
  await state.client.shutdown();
}
