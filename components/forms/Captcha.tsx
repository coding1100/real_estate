"use client";

import { useCallback } from "react";

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
  if (!SITE_KEY) return null;

  return (
    <script
      src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`}
      async
      defer
    />
  );
}

