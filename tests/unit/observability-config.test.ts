import { describe, expect, test } from "bun:test";
import {
  createBrowserPostHogOptions,
  isBrowserPostHogEnabled,
} from "@/modules/observability/client/posthog";

describe("configuração pública do PostHog", () => {
  test("desabilita toda captura automática", () => {
    const config = {
      projectToken: "phc_project_staging",
      host: "https://us.i.posthog.com",
      environment: "staging" as const,
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
      advanced_disable_flags: true,
      capture_performance: false,
      capture_dead_clicks: false,
      request_batching: false,
      mask_personal_data_properties: true,
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      persistence: "memory",
    });
  });

  test("inicializa apenas com configuração pública completa em ambiente permitido", () => {
    const runtime = {
      projectToken: "phc_project_staging",
      host: "https://us.i.posthog.com",
      environment: "staging" as const,
    };

    expect(isBrowserPostHogEnabled({ ...runtime, nodeEnv: "production" })).toBe(true);
    expect(isBrowserPostHogEnabled({ ...runtime, projectToken: undefined })).toBe(false);
    expect(isBrowserPostHogEnabled({ ...runtime, environment: "production" })).toBe(false);
    expect(isBrowserPostHogEnabled({ ...runtime, nodeEnv: "test" })).toBe(false);
    expect(isBrowserPostHogEnabled({ ...runtime, disabled: "1" })).toBe(false);
  });
});
