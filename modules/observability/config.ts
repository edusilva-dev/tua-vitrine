export const APP_ENVIRONMENTS = ["development", "staging", "production"] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

type BrowserPostHogInput = {
  projectToken?: string | undefined;
  host?: string | undefined;
  environment?: string | undefined;
};

export type BrowserPostHogConfig = {
  projectToken: string;
  host: string;
  environment: AppEnvironment;
};

function optionalValue(value: string | undefined) {
  const normalized = value?.trim();

  return normalized || undefined;
}

function parseProjectToken(value: string, variableName: string) {
  if (value.length < 10 || /\s/.test(value))
    throw new Error(`${variableName} deve conter um token de projeto PostHog válido.`);

  return value;
}

export function parsePostHogHost(value: string, variableName: string) {
  const host = new URL(value);

  if (
    host.protocol !== "https:" ||
    host.username ||
    host.password ||
    host.pathname !== "/" ||
    host.search ||
    host.hash
  )
    throw new Error(`${variableName} deve conter somente uma origem HTTPS.`);

  return host.origin;
}

export function parseAppEnvironment(value: string) {
  if (!APP_ENVIRONMENTS.includes(value as AppEnvironment))
    throw new Error(`NEXT_PUBLIC_APP_ENV deve ser um de: ${APP_ENVIRONMENTS.join(", ")}.`);

  return value as AppEnvironment;
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
    projectToken: parseProjectToken(projectToken, "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"),
    host: parsePostHogHost(host, "NEXT_PUBLIC_POSTHOG_HOST"),
    environment: parseAppEnvironment(environment),
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
    opt_out_capturing_by_default: config.environment === "production",
    persistence: "memory" as const,
    person_profiles: "identified_only" as const,
  };
}
