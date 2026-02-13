import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    body = (await req.json()) ?? {};
  } else {
    const formData = await req.formData();
    body = {
      domainId: formData.get("domainId") ?? undefined,
      slug: formData.get("slug") ?? undefined,
      type: formData.get("template") ?? undefined,
      headline: formData.get("headline") ?? undefined,
      subheadline: formData.get("subheadline") ?? undefined,
    };
  }

  let {
    domainId,
    slug,
    type,
    masterTemplateId,
    headline,
    subheadline,
  } = body;

  if (!type && !masterTemplateId) {
    return NextResponse.json(
      { error: "Missing required fields (template or masterTemplateId)" },
      { status: 400 },
    );
  }
  if (!masterTemplateId && type) {
    const template = await prisma.masterTemplate.findFirst({
      where: { type: String(type) },
    });
    if (!template) {
      return NextResponse.json(
        { error: `Unknown template type: ${type}` },
        { status: 400 },
      );
    }
    masterTemplateId = template.id;
  }

  const domainIdStr = domainId != null ? String(domainId) : "";
  if (!domainIdStr || !slug || !type || !masterTemplateId || !headline) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const page = await prisma.landingPage.create({
    data: {
      domainId: domainIdStr,
      slug: String(slug),
      type: String(type),
      masterTemplateId: String(masterTemplateId),
      status: "draft",
      headline: String(headline),
      subheadline: subheadline != null ? String(subheadline) : "",
      sections: {},
      ctaText: "Get Access",
      successMessage: "Thank you! We'll be in touch shortly.",
    },
  });

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(
      new URL(`/admin/pages/${page.id}/edit`, req.url),
      303,
    );
  }
  return NextResponse.json({ page }, { status: 201 });
}

