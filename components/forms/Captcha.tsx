"use client";

import { useCallback, useEffect } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function useRecaptcha() {
  const execute = useCallback(async (action: string) => {
    if (!SITE_KEY) {
      // No site key configured; skip CAPTCHA in development.
      return null;
    }

    if (typeof window === "undefined" || !window.grecaptcha) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      window.grecaptcha!.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(SITE_KEY, { action });
          resolve(token);
        } catch {
          resolve(null);
        }
      });
    });
  }, []);

  return { execute };
}

export function RecaptchaScript() {
  useEffect(() => {
    if (!SITE_KEY) return;
    if (typeof window === "undefined") return;

    const inject = () => {
      if (document.querySelector(`script[data-recaptcha-deferred="${SITE_KEY}"]`)) {
        return;
      }
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.setAttribute("data-recaptcha-deferred", SITE_KEY);
      document.head.appendChild(script);
    };

    const runAfterLoad = () => {
      if ("requestIdleCallback" in window) {
        const idleId = (window as Window & { requestIdleCallback: typeof requestIdleCallback }).requestIdleCallback(
          () => {
            inject();
          },
          { timeout: 5000 },
        );
        return () => {
          if ("cancelIdleCallback" in window) {
            (window as Window & { cancelIdleCallback: typeof cancelIdleCallback }).cancelIdleCallback(idleId);
          }
        };
      }
      const timeoutId = setTimeout(inject, 0);
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
  }, []);

  return null;
}

