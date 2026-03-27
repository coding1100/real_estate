"use client";

import { useCallback, useEffect } from "react";
import { deferUntilAfterLcpOrLoad } from "@/lib/deferNonCriticalScript";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let recaptchaReadyPromise: Promise<void> | null = null;

function injectRecaptchaScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve();

  const selector = `script[data-recaptcha-deferred="${SITE_KEY}"]`;

  return new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.grecaptcha) {
      resolve(undefined);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(selector);
    if (existing) {
      if (window.grecaptcha) {
        resolve(undefined);
        return;
      }
      existing.addEventListener("load", () => resolve(undefined), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("reCAPTCHA script failed")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-recaptcha-deferred", SITE_KEY);
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("reCAPTCHA script failed")),
      { once: true },
    );
    document.head.appendChild(script);
  }).then(() => {
    if (!SITE_KEY || !window.grecaptcha) return undefined;
    return new Promise<void>((resolve) => {
      window.grecaptcha!.ready(() => resolve(undefined));
    });
  });
}

/** Loads api.js if needed (e.g. user submits before deferred prefetch runs). */
export function ensureRecaptchaReady(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve();
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) {
    return new Promise<void>((resolve) => {
      window.grecaptcha!.ready(() => resolve());
    });
  }
  if (!recaptchaReadyPromise) {
    recaptchaReadyPromise = injectRecaptchaScript().catch((e) => {
      recaptchaReadyPromise = null;
      throw e;
    });
  }
  return recaptchaReadyPromise;
}

export function useRecaptcha() {
  const execute = useCallback(async (action: string) => {
    if (!SITE_KEY) {
      return null;
    }

    try {
      await ensureRecaptchaReady();
    } catch {
      return null;
    }

    if (!window.grecaptcha) {
      return null;
    }

    try {
      return await window.grecaptcha.execute(SITE_KEY, { action });
    } catch {
      return null;
    }
  }, []);

  return { execute };
}

export function RecaptchaScript() {
  useEffect(() => {
    if (!SITE_KEY) return;
    if (typeof window === "undefined") return;

    return deferUntilAfterLcpOrLoad(() => {
      void ensureRecaptchaReady().catch(() => {});
    });
  }, []);

  return null;
}
