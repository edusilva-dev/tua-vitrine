"use client";

import { useEffect } from "react";
import { analytics } from "../client/analytics";

export function AnalyticsIdentity({ userId }: { userId: string }) {
  useEffect(() => analytics.identify(userId), [userId]);

  return null;
}
