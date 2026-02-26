import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptchaToken } from "@/lib/captcha";
import { dispatchLeadToWebhooks } from "@/lib/webhooks";
import { sendLeadNotifications } from "@/lib/notifications";

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

    // Honeypot check: if filled, silently accept but do nothing
    if (website) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!domain || !slug || !type) {
      return NextResponse.json(
        { error: "Missing domain, slug, or type" },
        { status: 400 },
      );
    }

    // Verify reCAPTCHA (if configured)
    let captchaResult: any;
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
      return NextResponse.json(
        { error: "Unknown domain" },
        { status: 400 },
      );
    }

    const page = await prisma.landingPage.findFirst({
      where: {
        slug,
        domainId: domainRow.id,
        status: "published",
      },
    });
    if (!page) {
      return NextResponse.json(
        { error: "Unknown landing page" },
        { status: 400 },
      );
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
    }

    const lead = await prisma.lead.create({
      data: {
        domainId: domainRow.id,
        pageId: page.id,
        type: String(type),
        formData: mergedFormData as any,
        utmSource: typeof utm_source === "string" ? utm_source : undefined,
        utmMedium: typeof utm_medium === "string" ? utm_medium : undefined,
        utmCampaign: typeof utm_campaign === "string" ? utm_campaign : undefined,
      },
    });

    // Fire webhooks and notifications asynchronously (do not block response)
    void dispatchLeadToWebhooks(lead.id);
    void sendLeadNotifications(lead.id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/leads", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

