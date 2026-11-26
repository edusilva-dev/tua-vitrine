"use client";

import posthog from "posthog-js";
import { analytics } from "./analytics";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  type AnalyticsConsentState,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "./consent";

type ConsentSdk = {
  optIn: () => void;
  optOut: () => void;
};

type ConsentControllerOptions = {
  emitChange: (state: Exclude<AnalyticsConsentState, "unknown">) => void;
  initialize: () => boolean;
  resetAnalytics: () => void;
  sdk: ConsentSdk;
  storage: Pick<Storage, "getItem" | "setItem">;
};

export function createAnalyticsConsentController(options: ConsentControllerOptions) {
  return {
    restore(): AnalyticsConsentState {
      const state = readAnalyticsConsent(options.storage);

      if (state === "accepted" && options.initialize()) options.sdk.optIn();

      return state;
    },
    accept(): void {
      writeAnalyticsConsent(options.storage, "accepted");

      if (options.initialize()) options.sdk.optIn();

      options.emitChange("accepted");
    },
    reject(): void {
      options.resetAnalytics();
      options.sdk.optOut();
      writeAnalyticsConsent(options.storage, "rejected");
      options.emitChange("rejected");
    },
  };
}

const postHogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const appEnvironment = process.env.NEXT_PUBLIC_APP_ENV;
let initialized = false;

function initializePostHog(): boolean {
  if (initialized) return true;

  if (!postHogToken || !postHogHost || !appEnvironment || process.env.NODE_ENV === "test") {
    return false;
  }

  posthog.init(postHogToken, {
    api_host: postHogHost,
    defaults: "2026-08-30",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    advanced_disable_flags: true,
    person_profiles: "identified_only",
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
  });
  initialized = true;

  return true;
}

function emitChange(state: Exclude<AnalyticsConsentState, "unknown">): void {
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, { detail: state }));
}

function createBrowserController() {
  return createAnalyticsConsentController({
    storage: window.localStorage,
    initialize: initializePostHog,
    resetAnalytics: () => {
      if (initialized) analytics.reset(false);
    },
    sdk: {
      optIn: () => {
        if (initialized) posthog.opt_in_capturing({ captureEventName: false });
      },
      optOut: () => {
        if (initialized) posthog.opt_out_capturing();
      },
    },
    emitChange,
  });
}

export function restoreAnalyticsConsent(): AnalyticsConsentState {
  return createBrowserController().restore();
}

export function acceptAnalyticsConsent(): void {
  createBrowserController().accept();
}

export function rejectAnalyticsConsent(): void {
  createBrowserController().reject();
}
