"use client";

import { useEffect } from "react";

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
      window.gtag = window.gtag || function gtag(...args: unknown[]) {
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

    const runAfterLoad = () => {
      if ("requestIdleCallback" in window) {
        const idleId = (window as any).requestIdleCallback(
          () => {
            setTimeout(initializeGa, 1800);
          },
          { timeout: 5000 },
        );
        return () => {
          if ("cancelIdleCallback" in window) {
            (window as any).cancelIdleCallback(idleId);
          }
        };
      }

      const timeoutId = setTimeout(initializeGa, 1800);
      return () => clearTimeout(timeoutId);
    };

    let cleanup: (() => void) | undefined;
    if (document.readyState === "complete") {
      cleanup = runAfterLoad();
    } else {
      const onLoad = () => {
        cleanup = runAfterLoad();
      };
      window.addEventListener("load", onLoad, { once: true });
      return () => {
        window.removeEventListener("load", onLoad);
        cleanup?.();
      };
    }

    return () => {
      cleanup?.();
    };
  }, [measurementId]);

  return null;
}

