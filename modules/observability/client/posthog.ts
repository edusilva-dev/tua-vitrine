export interface BrowserPostHogInput {
  projectToken?: string | undefined;
  host?: string | undefined;
  environment?: string | undefined;
}

export interface BrowserPostHogConfig {
  projectToken: string;
  host: string;
  environment: "development" | "staging" | "production";
}

export interface BrowserPostHogRuntime {
  nodeEnv?: string | undefined;
  disabled?: string | undefined;
}

function optionalValue(value: string | undefined) {
  const normalized = value?.trim();

  return normalized || undefined;
}

function parseProjectToken(value: string) {
  if (value.length < 10 || /\s/.test(value))
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN deve conter um token de projeto PostHog válido."
    );

  return value;
}

function parsePostHogHost(value: string) {
  const host = new URL(value);

  if (
    host.protocol !== "https:" ||
    host.username ||
    host.password ||
    host.pathname !== "/" ||
    host.search ||
    host.hash
  )
    throw new Error("NEXT_PUBLIC_POSTHOG_HOST deve conter somente uma origem HTTPS.");

  return host.origin;
}

function parseEnvironment(value: string) {
  if (value !== "development" && value !== "staging" && value !== "production")
    throw new Error("NEXT_PUBLIC_APP_ENV deve ser um de: development, staging, production.");

  return value;
}

export function parseBrowserPostHogConfig(input: BrowserPostHogInput): BrowserPostHogConfig | null {
  const projectToken = optionalValue(input.projectToken);
  const host = optionalValue(input.host);
  const environment = optionalValue(input.environment);

  if (!projectToken && !host) return null;

  const missing = [
    ["NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", projectToken],
    ["NEXT_PUBLIC_POSTHOG_HOST", host],
    ["NEXT_PUBLIC_APP_ENV", environment],
  ].flatMap(([name, value]) => (value ? [] : [name]));

  if (missing.length > 0)
    throw new Error(`Configuração PostHog do browser incompleta: ${missing.join(", ")}.`);

  if (!projectToken || !host || !environment)
    throw new Error("Configuração PostHog do browser incompleta.");

  return {
    projectToken: parseProjectToken(projectToken),
    host: parsePostHogHost(host),
    environment: parseEnvironment(environment),
  };
}

export function createBrowserPostHogOptions(config: BrowserPostHogConfig) {
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
    mask_personal_data_properties: true,
    opt_out_capturing_by_default: config.environment === "production",
    persistence: "memory" as const,
    person_profiles: "identified_only" as const,
  };
}

export function shouldInitializeBrowserPostHog(
  config: BrowserPostHogConfig | null,
  runtime: BrowserPostHogRuntime
) {
  return Boolean(
    config &&
      config.environment !== "production" &&
      runtime.nodeEnv !== "test" &&
      runtime.disabled !== "1"
  );
}
