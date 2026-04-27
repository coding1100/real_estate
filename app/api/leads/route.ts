import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptchaToken } from "@/lib/captcha";
import { sendLeadNotifications } from "@/lib/notifications";
import {
  enqueueLeadDispatchJobsTx,
  ensureLeadDispatchTableOnce,
  markLeadDispatchJobDoneByType,
  processLeadDispatchQueue,
} from "@/lib/leadDispatchQueue";
import type { Prisma } from "@prisma/client";

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
  const looksLikePhone = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.includes("@")) return false;
    const digits = trimmed.replace(/\D/g, "");
    return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
  };

  const looksLikePhoneKey = (key: string): boolean => {
    const normalized = key.trim().toLowerCase();
    return (
      normalized === "phone" ||
      normalized.includes("phone") ||
      normalized.includes("mobile") ||
      normalized === "tel" ||
      normalized.includes("telephone")
    );
  };

  const seen = new Set<unknown>();
  const findByPhoneKey = (node: unknown): string | null => {
    if (!node || typeof node !== "object") return null;
    if (seen.has(node)) return null;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const entry of node) {
        const match = findByPhoneKey(entry);
        if (match) return match;
      }
      return null;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "string" && looksLikePhoneKey(key) && looksLikePhone(value)) {
        return value.trim();
      }
      if (value && typeof value === "object") {
        const nested = findByPhoneKey(value);
        if (nested) return nested;
      }
    }
    return null;
  };

  const keyed = findByPhoneKey(input);
  if (keyed) return keyed;

  const values = collectStringValues(input);
  for (const v of values) {
    if (looksLikePhone(v)) return v.trim();
  }
  return null;
}

function findNameInAnyField(input: unknown): string | null {
  const likelyNameKey = (key: string): boolean => {
    const normalized = key.trim().toLowerCase();
    return (
      normalized === "name" ||
      normalized === "fullname" ||
      normalized === "full_name" ||
      normalized === "full-name" ||
      normalized === "firstname" ||
      normalized === "first_name" ||
      normalized === "first-name" ||
      normalized === "lastname" ||
      normalized === "last_name" ||
      normalized === "last-name" ||
      normalized === "n"
    );
  };
  const looksLikePersonName = (value: string): boolean => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) return false;
    if (normalized.length > 80) return false;
    if (/@/.test(normalized)) return false;
    if (/\d/.test(normalized)) return false;
    return /[A-Za-z]/.test(normalized);
  };

  const seen = new Set<unknown>();
  const visit = (node: unknown): string | null => {
    if (!node || typeof node !== "object") return null;
    if (seen.has(node)) return null;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const nested = visit(item);
        if (nested) return nested;
      }
      return null;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "string" && likelyNameKey(key) && looksLikePersonName(value)) {
        return value.trim();
      }
      if (value && typeof value === "object") {
        const nested = visit(value);
        if (nested) return nested;
      }
    }
    return null;
  };

  return visit(input);
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

    const captchaPromise = verifyRecaptchaToken(recaptchaToken ?? null).catch((e) => {
      console.error("[recaptcha] verification error", e);
      // Treat verification errors as hard failures, but avoid 500s.
      return { ok: false, score: 0, skipped: false } as {
        ok: boolean;
        score?: number;
        skipped?: boolean;
        raw?: Record<string, unknown>;
      };
    });

    // Query page+domain in one round-trip while CAPTCHA verification is in flight.
    const pageWithDomainPromise = prisma.landingPage.findFirst({
      where: {
        slug,
        status: "published",
        domain: {
          hostname: String(domain),
          isActive: true,
        },
      },
      include: {
        domain: true,
      },
    });

    const [captchaResult, pageWithDomain] = await Promise.all([
      captchaPromise,
      pageWithDomainPromise,
    ]);

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

    if (!pageWithDomain) {
      console.warn("[leads] Unknown/inactive domain or unknown published page", {
        domain,
        slug,
      });
      // Soft-fail for user experience; no lead is stored but UI succeeds.
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const page = pageWithDomain;
    const domainRow = pageWithDomain.domain;

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

    // Keep critical multistep routing keys at top-level for downstream
    // notification/template/rule resolution.
    if (typeof restForm._ctaText === "string" && restForm._ctaText.trim()) {
      mergedFormData._ctaText = restForm._ctaText.trim();
    }
    if (typeof restForm._stepSlug === "string" && restForm._stepSlug.trim()) {
      mergedFormData._stepSlug = restForm._stepSlug.trim();
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

    await ensureLeadDispatchTableOnce();
    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
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
      await enqueueLeadDispatchJobsTx(tx, created.id);
      return created;
    });
    console.log("[leads] Lead created and dispatch jobs enqueued", {
      leadId: lead.id,
      domain: domainRow.hostname,
      entryPageSlug: page.slug,
      type: lead.type,
      hasMultistepData: !!_multistepData,
      hasStepSlug: typeof mergedFormData._stepSlug === "string",
      hasCtaText: typeof mergedFormData._ctaText === "string",
    });

    // Keep submit fast: notifications are handled by the durable queue.
    // We still attempt an opportunistic async send, but never block response.
    void sendLeadNotifications(lead.id, { throwOnFailure: true })
      .then(async () => {
        await markLeadDispatchJobDoneByType(lead.id, "notifications");
        console.log("[leads] Immediate notifications send succeeded", {
          leadId: lead.id,
        });
      })
      .catch((notificationError) => {
        console.error("[leads] Immediate notification send failed; queue retry will continue", {
          leadId: lead.id,
          error: notificationError,
        });
      });

    // Opportunistically run one queued dispatch immediately.
    // If the process exits early, the persisted queue guarantees retry.
    void processLeadDispatchQueue({
      maxJobs: 2,
      workerId: `api-leads-${lead.id}`,
    })
      .then((queueResult) => {
        console.log("[leads] Immediate queue drain completed", {
          leadId: lead.id,
          ...queueResult,
        });
      })
      .catch((queueError) => {
      console.error("[leads] Immediate queue drain failure", {
        leadId: lead.id,
        error: queueError,
      });
      });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/leads", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

