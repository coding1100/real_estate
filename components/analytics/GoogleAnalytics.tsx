"use client";

import { useEffect } from "react";
import { deferUntilAfterLcpOrLoad } from "@/lib/deferNonCriticalScript";

interface GoogleAnalyticsProps {
  measurementId?: string | null;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __ga4LoadedIds?: Set<string>;
  }
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  useEffect(() => {
    if (!measurementId) return;
    if (typeof window === "undefined") return;

    if (!window.__ga4LoadedIds) {
      window.__ga4LoadedIds = new Set<string>();
    }
    if (window.__ga4LoadedIds.has(measurementId)) return;

    const initializeGa = () => {
      if (window.__ga4LoadedIds?.has(measurementId)) return;

      window.dataLayer = window.dataLayer || [];
      window.gtag =
        window.gtag ||
        function gtag(...args: unknown[]) {
          window.dataLayer.push(args);
        };
      window.gtag("js", new Date());
      window.gtag("config", measurementId);

      const existing = document.querySelector(
        `script[data-ga4-id="${measurementId}"]`,
      );
      if (!existing) {
        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        script.async = true;
        script.setAttribute("data-ga4-id", measurementId);
        document.head.appendChild(script);
      }

      window.__ga4LoadedIds?.add(measurementId);
    };

    // Load GA after critical paint/lifecycle settles (without requiring user interaction).
    return deferUntilAfterLcpOrLoad(initializeGa);
  }, [measurementId]);

  return null;
}
