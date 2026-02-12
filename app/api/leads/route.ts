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
    const captchaResult = await verifyRecaptchaToken(recaptchaToken ?? null);
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

    // Basic UTM extraction if present in payload
    const { utm_source, utm_medium, utm_campaign } = formData;

    // Insert lead
    const lead = await prisma.lead.create({
      data: {
        domainId: domainRow.id,
        pageId: page.id,
        type: String(type),
        formData,
        utmSource:
          typeof utm_source === "string" ? utm_source : undefined,
        utmMedium:
          typeof utm_medium === "string" ? utm_medium : undefined,
        utmCampaign:
          typeof utm_campaign === "string" ? utm_campaign : undefined,
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

