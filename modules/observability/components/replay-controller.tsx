"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  browserAnalyticsConsent,
  syncBrowserReplay,
} from "@/modules/observability/client/browser-consent";
import { unknownAnalyticsConsent } from "@/modules/observability/client/consent";

export function ReplayController() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    browserAnalyticsConsent.subscribe,
    browserAnalyticsConsent.getSnapshot,
    () => unknownAnalyticsConsent
  );

  useEffect(() => {
    if (consent.revision === 0) return;

    syncBrowserReplay(pathname, consent.status);
  }, [consent.revision, consent.status, pathname]);

  return null;
}
