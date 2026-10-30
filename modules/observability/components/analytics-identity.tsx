"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { browserAnalyticsConsent } from "@/modules/observability/client/browser-consent";
import { unknownAnalyticsConsent } from "@/modules/observability/client/consent";
import { analyticsIdentity, type BrowserIdentity } from "@/modules/observability/client/identity";
import type { AnalyticsStoreGroup } from "@/modules/observability/contracts/store-group";

export interface AnalyticsIdentityState {
  currentUserId: string | null;
  currentStoreFingerprint?: string | null;
  consentRevision?: number;
}

export interface AnalyticsIdentityProps {
  userId: string | null;
  store?: AnalyticsStoreGroup | null;
}

export function syncAnalyticsIdentity(
  identity: BrowserIdentity,
  state: AnalyticsIdentityState,
  nextUserId: string | null,
  store: AnalyticsStoreGroup | null = null
) {
  if (state.currentUserId !== nextUserId && state.currentUserId !== null) {
    if (!identity.reset()) return;

    state.currentUserId = null;
    state.currentStoreFingerprint = null;
  }

  if (nextUserId === null && !identity.anonymize()) return;

  if (nextUserId !== null && state.currentUserId !== nextUserId && identity.identify(nextUserId)) {
    state.currentUserId = nextUserId;
  }

  if (!store) return;

  const fingerprint = JSON.stringify(store);

  if (state.currentStoreFingerprint === fingerprint) return;

  if (identity.group(store)) state.currentStoreFingerprint = fingerprint;
}

export function AnalyticsIdentity({ userId, store = null }: AnalyticsIdentityProps) {
  const consent = useSyncExternalStore(
    browserAnalyticsConsent.subscribe,
    browserAnalyticsConsent.getSnapshot,
    () => unknownAnalyticsConsent
  );
  const state = useRef<AnalyticsIdentityState>({
    currentUserId: null,
    currentStoreFingerprint: null,
  });

  useEffect(() => {
    if (state.current.consentRevision !== consent.revision) {
      state.current = {
        currentUserId: null,
        currentStoreFingerprint: null,
        consentRevision: consent.revision,
      };
    }

    if (consent.status !== "accepted") return;

    syncAnalyticsIdentity(analyticsIdentity, state.current, userId, store);
  }, [userId, store, consent]);

  return null;
}
