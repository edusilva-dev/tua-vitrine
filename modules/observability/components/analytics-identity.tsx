"use client";

import { useEffect } from "react";
import { analytics } from "../client/analytics";
import { ANALYTICS_CONSENT_CHANGED_EVENT } from "../client/consent";
import type { AnalyticsStoreGroupInput } from "../contracts/events";

export function AnalyticsIdentity({
  userId,
  store,
}: {
  userId?: string;
  store?: AnalyticsStoreGroupInput;
}) {
  const storeId = store?.storeId;
  const plan = store?.plan;
  const status = store?.status;
  const onboardingStep = store?.onboardingStep;

  useEffect(() => {
    function syncIdentity() {
      if (userId) analytics.identify(userId);
    }

    syncIdentity();
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncIdentity);

    return () => window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncIdentity);
  }, [userId]);

  useEffect(() => {
    if (!storeId || !plan || !status || !onboardingStep) return;

    const storeInput = { storeId, plan, status, onboardingStep };

    function syncStore() {
      analytics.groupStore(storeInput);
    }

    syncStore();
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncStore);

    return () => window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncStore);
  }, [storeId, plan, status, onboardingStep]);

  return null;
}
