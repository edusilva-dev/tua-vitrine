"use client";

import posthog from "posthog-js";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  type AnalyticsConsentState,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "./consent";

type ConsentControllerOptions = {
  emitChange: (state: Exclude<AnalyticsConsentState, "unknown">) => void;
  storage: Pick<Storage, "getItem" | "setItem">;
};

export function createAnalyticsConsentController(options: ConsentControllerOptions) {
  return {
    restore(): AnalyticsConsentState {
      const state = readAnalyticsConsent(options.storage);

      return state;
    },
    accept(): void {
      writeAnalyticsConsent(options.storage, "accepted");
      options.emitChange("accepted");
    },
    reject(): void {
      writeAnalyticsConsent(options.storage, "rejected");
      options.emitChange("rejected");
    },
  };
}

const postHogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const appEnvironment = process.env.NEXT_PUBLIC_APP_ENV;
let initialized = false;

export function initializePostHog(): boolean {
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
    person_profiles: "never",
    cookieless_mode: "always",
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
