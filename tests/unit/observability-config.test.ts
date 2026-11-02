import { describe, expect, test } from "bun:test";
import {
  createBrowserPostHogOptions,
  isBrowserPostHogEnabled,
  stripNavigationProperties,
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

  test("remove URL, busca, referrer e campanha antes do envio", () => {
    const event = stripNavigationProperties({
      uuid: "33333333-3333-4333-8333-333333333333",
      event: "catalog_viewed",
      properties: {
        token: "phc_test",
        store_id: "22222222-2222-4222-8222-222222222222",
        $groups: { store: "22222222-2222-4222-8222-222222222222" },
        $current_url: "https://example.test/loja?q=segredo",
        $referrer: "https://example.test/?token=segredo",
        $initial_referrer: "https://example.test/?token=segredo",
        utm_campaign: "segredo",
        $pathname: "/loja",
        $set_once: { $initial_current_url: "https://example.test/?q=segredo" },
      },
      $set_once: { $initial_referrer: "https://example.test/?q=segredo" },
    });

    expect(event?.properties).toMatchObject({
      token: "phc_test",
      store_id: "22222222-2222-4222-8222-222222222222",
      $groups: { store: "22222222-2222-4222-8222-222222222222" },
    });
    expect(JSON.stringify(event)).not.toContain("segredo");
    expect(event?.properties).not.toHaveProperty("$pathname");
  });
});
