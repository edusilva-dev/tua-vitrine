import { describe, expect, test } from "bun:test";
import {
  createBrowserPostHogOptions,
  isBrowserPostHogEnabled,
  maskReplayNetworkRequest,
  replayAllowedPath,
  screenNameForEvent,
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
      enable_recording_console_log: false,
      disable_capture_url_hashes: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        maskAllElementAttributes: true,
        captureJsonLd: false,
        captureCanvas: { recordCanvas: false },
        recordHeaders: false,
        recordBody: false,
        sampleRate: 0.1,
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
      persistence: "memory",
    });
  });

  test("replay só permite vitrine e telas administrativas classificadas", () => {
    expect(replayAllowedPath("/cafe-do-bairro")).toBe(true);
    expect(replayAllowedPath("/admin/products")).toBe(true);
    expect(replayAllowedPath("/admin/metrics")).toBe(true);
    expect(replayAllowedPath("/admin/preview")).toBe(false);
    expect(replayAllowedPath("/admin/billing")).toBe(false);
    expect(replayAllowedPath("/admin/support")).toBe(false);
    expect(replayAllowedPath("/cadastro")).toBe(false);
    expect(replayAllowedPath("/redefinir-senha")).toBe(false);
  });

  test("desenvolvimento grava sessões de teste e staging amostra 10%", () => {
    expect(
      createBrowserPostHogOptions({
        projectToken: "phc_project_development",
        host: "https://us.i.posthog.com",
        environment: "development",
      }).session_recording.sampleRate
    ).toBe(1);
  });

  test("replay elimina parâmetros e rejeita metadados de rede", () => {
    expect(
      maskReplayNetworkRequest({ name: "https://example.test/loja?q=sentinela#secret" })
    ).toEqual({ name: "https://example.test/loja" });
    expect(
      maskReplayNetworkRequest({ name: "https://example.test/api?token=sentinela", method: "GET" })
    ).toBeNull();
    expect(
      maskReplayNetworkRequest({ name: "https://example.test/loja?q=sentinela", isInitial: true })
    ).toBeNull();
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

  test("usa o caminho real somente nos eventos explícitos do navegador", () => {
    const productForm = stripNavigationProperties({
      uuid: "44444444-4444-4444-8444-444444444444",
      event: "product_creation_started",
      properties: { $current_url: "https://example.test/admin/products?draft=secret" },
    });
    const sdkIdentity = stripNavigationProperties({
      uuid: "55555555-5555-4555-8555-555555555555",
      event: "$identify",
      properties: { $current_url: "https://example.test/admin/products?draft=secret" },
    });

    expect(productForm?.properties).toEqual({ $screen_name: "/admin/products" });
    expect(sdkIdentity?.properties).toEqual({});
    expect(screenNameForEvent("catalog_viewed", "/cafe-do-bairro")).toBe("/cafe-do-bairro");
    expect(screenNameForEvent("product_viewed", "/cafe-do-bairro/")).toBe("/cafe-do-bairro");
    expect(screenNameForEvent("whatsapp_clicked", "/cafe-do-bairro?q=segredo")).toBeNull();
    expect(screenNameForEvent("$groupidentify", "/cafe-do-bairro")).toBeNull();
  });
});
