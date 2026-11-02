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
    disable_surveys: true,
    advanced_disable_feature_flags: true,
    advanced_disable_flags: true,
    capture_performance: false,
    capture_dead_clicks: false,
    request_batching: false,
    mask_personal_data_properties: true,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    persistence: "memory" as const,
    person_profiles: "identified_only" as const,
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
