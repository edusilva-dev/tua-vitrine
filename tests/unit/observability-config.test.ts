import { describe, expect, test } from "bun:test";
import {
  createBrowserPostHogOptions,
  parseBrowserPostHogConfig,
  parsePostHogHost,
} from "@/modules/observability/config";

describe("configuração pública do PostHog", () => {
  test("ausência de token e host mantém o browser em noop", () => {
    expect(parseBrowserPostHogConfig({ environment: "development" })).toBeNull();
  });

  test("aceita um conjunto completo e normaliza a origem", () => {
    expect(
      parseBrowserPostHogConfig({
        projectToken: "phc_project_staging",
        host: "https://eu.i.posthog.com/",
        environment: "staging",
      })
    ).toEqual({
      projectToken: "phc_project_staging",
      host: "https://eu.i.posthog.com",
      environment: "staging",
    });
  });

  test("recusa conjunto parcial, ambiente desconhecido e host com caminho", () => {
    expect(() => parseBrowserPostHogConfig({ projectToken: "phc_project_staging" })).toThrow(
      /incompleta/
    );
    expect(() =>
      parseBrowserPostHogConfig({
        projectToken: "phc_project_staging",
        host: "https://eu.i.posthog.com",
        environment: "preview",
      })
    ).toThrow(/NEXT_PUBLIC_APP_ENV/);
    expect(() => parsePostHogHost("https://eu.i.posthog.com/capture", "HOST")).toThrow(
      /origem HTTPS/
    );
  });

  test("desabilita captura automática e mantém produção optada para fora", () => {
    const config = {
      projectToken: "phc_project_production",
      host: "https://us.i.posthog.com",
      environment: "production" as const,
    };

    expect(createBrowserPostHogOptions(config)).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_exceptions: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      opt_out_capturing_by_default: true,
      persistence: "memory",
    });
    expect(
      createBrowserPostHogOptions({ ...config, environment: "staging" })
        .opt_out_capturing_by_default
    ).toBe(false);
  });
});
