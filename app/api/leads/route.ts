import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptchaToken } from "@/lib/captcha";
import { dispatchLeadToWebhooks } from "@/lib/webhooks";
import { dispatchLeadToFollowUpBoss } from "@/lib/followupboss";
import { sendLeadNotifications } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function collectStringValues(input: unknown, seen = new Set<unknown>()): string[] {
  if (input == null) return [];
  if (typeof input === "string") {
    const s = input.trim();
    return s ? [s] : [];
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return [String(input)];
  }
  if (typeof input !== "object") return [];
  if (seen.has(input)) return [];
  seen.add(input);

  if (Array.isArray(input)) {
    return input.flatMap((v) => collectStringValues(v, seen));
  }
  const out: string[] = [];
  for (const v of Object.values(input as Record<string, unknown>)) {
    out.push(...collectStringValues(v, seen));
  }
  return out;
}

function findEmailInAnyField(input: unknown): string | null {
  const values = collectStringValues(input);
  for (const v of values) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return v;
  }
  return null;
}

function findPhoneInAnyField(input: unknown): string | null {
  const values = collectStringValues(input);
  for (const v of values) {
    const digits = v.replace(/\D/g, "");
    if (digits.length >= 7) return v.trim();
  }
  return null;
}

function findNameInAnyField(input: unknown): string | null {
  if (!isPlainObject(input)) return null;
  const direct =
    (typeof input.name === "string" && input.name.trim()) ||
    (typeof (input as any).fullName === "string" && (input as any).fullName.trim()) ||
    (typeof (input as any).fullname === "string" && (input as any).fullname.trim());
  if (direct) return String(direct).trim();
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      domain,
      slug,
      type,
      recaptchaToken,
      website, // honeypot from DynamicForm
      ...formData
    } = body ?? {};

    const honeypotValue =
      typeof website === "string"
        ? website.replace(/&nbsp;/gi, " ").replace(/\u00A0/g, " ").trim()
        : "";
    // Honeypot check: if filled, silently accept but do nothing.
    // Ignore whitespace-only noise values.
    if (honeypotValue.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!domain || !slug || !type) {
      console.warn("[leads] Missing domain, slug, or type in payload", {
        hasDomain: !!domain,
        hasSlug: !!slug,
        hasType: !!type,
      });
      // Fail soft: avoid surfacing a hard error to end users while still
      // logging the misconfiguration for diagnostics.
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Verify reCAPTCHA (if configured)
    let captchaResult: {
      ok: boolean;
      score?: number;
      skipped?: boolean;
      raw?: Record<string, unknown>;
    };
    try {
      captchaResult = await verifyRecaptchaToken(recaptchaToken ?? null);
    } catch (e) {
      console.error("[recaptcha] verification error", e);
      // Treat verification errors as hard failures, but avoid 500s.
      captchaResult = { ok: false, score: 0, skipped: false };
    }

    // Log reCAPTCHA outcome for debugging/monitoring
    // Does not log the raw token, only verification result metadata.
    try {
      const errorCodes =
        captchaResult && "raw" in captchaResult && captchaResult.raw && "error-codes" in captchaResult.raw
          ? (captchaResult.raw["error-codes"] as string[] | undefined)
          : undefined;
      console.log("[recaptcha] verification", {
        ok: captchaResult.ok,
        score: "score" in captchaResult ? captchaResult.score : undefined,
        skipped: captchaResult.skipped,
        errorCodes,
      });
    } catch {
      // Swallow logging errors; do not affect lead submission flow.
    }

    if (!captchaResult.ok) {
      return NextResponse.json(
        { error: "Failed CAPTCHA verification" },
        { status: 400 },
      );
    }

    // Find domain + page
    const domainRow = await prisma.domain.findFirst({
      where: { hostname: domain, isActive: true },
    });
    if (!domainRow) {
      console.warn("[leads] Unknown or inactive domain", { domain });
      // Soft-fail for user experience; no lead is stored but UI succeeds.
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const page = await prisma.landingPage.findFirst({
      where: {
        slug,
        domainId: domainRow.id,
        status: "published",
      },
    });
    if (!page) {
      console.warn("[leads] Unknown landing page for domain", {
        domain: domainRow.hostname,
        slug,
      });
      // Soft-fail for user experience; no lead is stored but UI succeeds.
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { utm_source, utm_medium, utm_campaign, _multistepData, ...restForm } = formData as Record<string, unknown>;
    let mergedFormData: Record<string, unknown> = restForm;
    if (typeof _multistepData === "string") {
      try {
        const parsed = JSON.parse(_multistepData) as Record<string, unknown>;
        const lastStepKey = "step" + (Object.keys(parsed).length);
        mergedFormData = { ...parsed, [lastStepKey]: restForm };
      } catch {
        // ignore invalid JSON
      }
    } else if (_multistepData && typeof _multistepData === "object") {
      const parsed = _multistepData as Record<string, unknown>;
      const lastStepKey = "step" + (Object.keys(parsed).length);
      mergedFormData = { ...parsed, [lastStepKey]: restForm };
    }

    // Normalize core contact fields at the top-level so integrations (e.g. FUB)
    // can always identify the person, even if the form uses compact IDs or
    // nested step payloads.
    if (!("email" in mergedFormData) || !String((mergedFormData as any).email ?? "").includes("@")) {
      const email = findEmailInAnyField(mergedFormData);
      if (email) mergedFormData = { ...mergedFormData, email };
    }
    if (!("phone" in mergedFormData) || !String((mergedFormData as any).phone ?? "").trim()) {
      const phone = findPhoneInAnyField(mergedFormData);
      if (phone) mergedFormData = { ...mergedFormData, phone };
    }
    if (!("name" in mergedFormData) || !String((mergedFormData as any).name ?? "").trim()) {
      const name = findNameInAnyField(mergedFormData);
      if (name) mergedFormData = { ...mergedFormData, name };
    }

    const lead = await prisma.lead.create({
      data: {
        domainId: domainRow.id,
        pageId: page.id,
        type: String(type),
        formData: mergedFormData as Prisma.InputJsonValue,
        utmSource: typeof utm_source === "string" ? utm_source : undefined,
        utmMedium: typeof utm_medium === "string" ? utm_medium : undefined,
        utmCampaign: typeof utm_campaign === "string" ? utm_campaign : undefined,
      },
    });

    // Await external dispatches so they complete before serverless function exits (Vercel)
    await Promise.allSettled([
      dispatchLeadToWebhooks(lead.id),
      dispatchLeadToFollowUpBoss(lead.id),
      sendLeadNotifications(lead.id),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/leads", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

