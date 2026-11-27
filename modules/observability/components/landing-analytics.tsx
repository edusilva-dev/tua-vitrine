"use client";

import { useEffect, useRef } from "react";
import { analytics } from "../client/analytics";
import { type LandingCtaClickedInput, landingCtaClickedInputSchema } from "../contracts/events";

function landingSource(): LandingCtaClickedInput["source"] {
  const params = new URLSearchParams(window.location.search);

  if (["utm_campaign", "gclid", "fbclid"].some((name) => params.has(name))) return "campaign";

  if (!document.referrer) return "direct";

  try {
    const referrerHost = new URL(document.referrer).hostname;

    if (referrerHost === window.location.hostname) return "direct";

    if (/google\.|bing\.|duckduckgo\.|yahoo\./i.test(referrerHost)) return "organic";

    if (/instagram\.|facebook\.|tiktok\.|linkedin\.|x\.com$|twitter\./i.test(referrerHost))
      return "social";

    return "referral";
  } catch {
    return "direct";
  }
}

export function LandingAnalytics() {
  const viewed = useRef(false);

  useEffect(() => {
    const source = landingSource();

    if (!viewed.current) {
      viewed.current = true;
      analytics.landingPageViewed({ source });
    }

    function captureCta(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLElement>("[data-analytics-cta]");

      if (!link) return;

      const input = landingCtaClickedInputSchema.safeParse({
        source,
        cta: link.dataset.analyticsCta,
        location: link.dataset.analyticsLocation,
        ...(link.dataset.analyticsPlan ? { selectedPlan: link.dataset.analyticsPlan } : {}),
      });

      if (input.success) analytics.landingCtaClicked(input.data);
    }

    document.addEventListener("click", captureCta);

    return () => document.removeEventListener("click", captureCta);
  }, []);

  return null;
}
