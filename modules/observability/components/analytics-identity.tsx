"use client";

import { useEffect } from "react";
import { analytics } from "../client/analytics";
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
    if (userId) analytics.identify(userId);
  }, [userId]);

  useEffect(() => {
    if (!storeId || !plan || !status || !onboardingStep) return;

    analytics.groupStore({ storeId, plan, status, onboardingStep });
  }, [storeId, plan, status, onboardingStep]);

  return null;
}
