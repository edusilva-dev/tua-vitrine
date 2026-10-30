"use client";

import { useEffect, useRef } from "react";
import { analyticsIdentity, type BrowserIdentity } from "@/modules/observability/client/identity";

export interface AnalyticsIdentityState {
  currentUserId: string | null;
}

export interface AnalyticsIdentityProps {
  userId: string | null;
}

export function syncAnalyticsIdentity(
  identity: BrowserIdentity,
  state: AnalyticsIdentityState,
  nextUserId: string | null
) {
  if (state.currentUserId === nextUserId) return;

  if (state.currentUserId !== null) {
    if (!identity.reset()) return;

    state.currentUserId = null;
  }

  if (nextUserId !== null && identity.identify(nextUserId)) {
    state.currentUserId = nextUserId;
  }
}

export function AnalyticsIdentity({ userId }: AnalyticsIdentityProps) {
  const state = useRef<AnalyticsIdentityState>({ currentUserId: null });

  useEffect(() => {
    syncAnalyticsIdentity(analyticsIdentity, state.current, userId);
  }, [userId]);

  return null;
}
