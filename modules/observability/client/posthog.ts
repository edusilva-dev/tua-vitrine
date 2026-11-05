import type { BeforeSendFn } from "posthog-js";

export function replayAllowedPath(pathname: string) {
  return (
    (/^\/[a-z0-9-]+\/?$/.test(pathname) &&
      ![
        "/cadastro",
        "/entrar",
        "/recuperar-senha",
        "/redefinir-senha",
        "/verificar-email",
        "/vitrine",
      ].includes(pathname.replace(/\/$/, ""))) ||
    ["/admin", "/admin/products", "/admin/metrics", "/admin/promotions"].includes(pathname)
  );
}

export function maskReplayNetworkRequest<
  T extends { name: string; initiatorType?: string; method?: string; isInitial?: boolean },
>(request: T): T | null {
  if (request.initiatorType || request.method || request.isInitial) return null;

  try {
    const base = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const url = new URL(request.name, base);

    return { ...request, name: `${url.origin}${url.pathname}` };
  } catch {
    return null;
  }
}

function removeNavigationFields(properties: Record<string, unknown>) {
  for (const [key, value] of Object.entries(properties)) {
    if (/url|referr|pathname|search|query|utm|campaign|gclid|fbclid/i.test(key)) {
      delete properties[key];

      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      removeNavigationFields(value as Record<string, unknown>);
    }
  }
}

export function screenNameForEvent(eventName: string, pathname: string | undefined) {
  if (eventName === "product_creation_started") return "/admin/products";

  if (!["catalog_viewed", "product_viewed", "whatsapp_clicked"].includes(eventName)) return null;

  if (!pathname || !/^\/[a-z0-9-]+\/?$/.test(pathname)) return null;

  return pathname.replace(/\/$/, "");
}

export const stripNavigationProperties: BeforeSendFn = (event) => {
  if (event.properties) removeNavigationFields(event.properties);

  if (event.$set) removeNavigationFields(event.$set);

  if (event.$set_once) removeNavigationFields(event.$set_once);

  if (event.properties) {
    const screenName = screenNameForEvent(
      event.event,
      typeof window === "undefined" ? undefined : window.location.pathname
    );

    if (screenName) event.properties.$screen_name = screenName;
  }

  return event;
};

export interface BrowserPostHogRuntime {
  projectToken?: string | undefined;
  host?: string | undefined;
  environment?: string | undefined;
  nodeEnv?: string | undefined;
  disabled?: string | undefined;
}

export interface EnabledBrowserPostHogRuntime extends BrowserPostHogRuntime {
  projectToken: string;
  host: string;
  environment: "development" | "staging";
}

export function createBrowserPostHogOptions(config: EnabledBrowserPostHogRuntime) {
  return {
    api_host: config.host,
    defaults: "2026-08-30" as const,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    disable_session_recording: true,
    enable_recording_console_log: false,
    disable_capture_url_hashes: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
      maskAllElementAttributes: true,
      blockSelector: 'input[type="hidden"], input[type="file"], .ph-no-capture',
      captureJsonLd: false,
      captureCanvas: { recordCanvas: false },
      recordHeaders: false,
      recordBody: false,
      maskCapturedNetworkRequestFn: maskReplayNetworkRequest,
      sampleRate: config.environment === "development" ? 1 : 0.1,
    },
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    advanced_disable_flags: false,
    capture_performance: false,
    capture_dead_clicks: false,
    request_batching: false,
    mask_personal_data_properties: true,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    persistence: "memory" as const,
    person_profiles: "identified_only" as const,
    before_send: stripNavigationProperties,
  };
}

export function isBrowserPostHogEnabled(
  runtime: BrowserPostHogRuntime
): runtime is EnabledBrowserPostHogRuntime {
  return Boolean(
    runtime.projectToken &&
      runtime.host &&
      (runtime.environment === "development" || runtime.environment === "staging") &&
      runtime.nodeEnv !== "test" &&
      runtime.disabled !== "1"
  );
}
