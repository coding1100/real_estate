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

  // Seed values that we will try to inherit from the master template (or a base page)
  let selectedTemplate: any = null;
  let sectionsSeed: any = [];
  let formSchemaSeed: any = null;
  let heroImageUrlSeed: string | null = null;
  let ctaTextSeed = "Get Access";
  let successMessageSeed =
    "Thank you! We'll be in touch shortly.";

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
    selectedTemplate = template;
  }

  const domainIdStr = domainId != null ? String(domainId) : "";
  if (!domainIdStr || !slug || !type || !masterTemplateId || !headline) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Prevent duplicate (domainId, slug) combinations before attempting create
  const existing = await prisma.landingPage.findFirst({
    where: {
      domainId: domainIdStr,
      slug: String(slug),
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A page with this slug already exists for this domain." },
      { status: 400 },
    );
  }

  // If we haven't already loaded the master template (e.g. caller passed masterTemplateId directly),
  // load it now so we can inherit its content.
  if (!selectedTemplate && masterTemplateId) {
    selectedTemplate = await prisma.masterTemplate.findUnique({
      where: { id: String(masterTemplateId) },
    });
  }

  if (selectedTemplate) {
    const tplSections = (selectedTemplate.sections as any) ?? [];
    if (Array.isArray(tplSections) && tplSections.length > 0) {
      sectionsSeed = tplSections;
    }
    const tplFormSchema = (selectedTemplate.formSchema as any) ?? null;
    if (tplFormSchema) {
      formSchemaSeed = tplFormSchema;
    }
  }

  // Fallback: if the master template doesn't yet have sections / form schema defined,
  // inherit from the most recently updated page that uses this masterTemplate.
  if (
    (!Array.isArray(sectionsSeed) || sectionsSeed.length === 0) ||
    !formSchemaSeed
  ) {
    const basePage = await prisma.landingPage.findFirst({
      where: { masterTemplateId: String(masterTemplateId) },
      orderBy: { updatedAt: "desc" },
    });

    if (basePage) {
      const baseSections = (basePage.sections as any) ?? [];
      if (Array.isArray(baseSections) && baseSections.length > 0) {
        sectionsSeed = baseSections;
      }
      if (basePage.formSchema) {
        formSchemaSeed = basePage.formSchema as any;
      }
      heroImageUrlSeed = basePage.heroImageUrl ?? null;
      ctaTextSeed = (basePage.ctaText as string) ?? ctaTextSeed;
      successMessageSeed =
        (basePage.successMessage as string) ?? successMessageSeed;
    }
  }

  let page;
  try {
    page = await prisma.landingPage.create({
      data: {
        domainId: domainIdStr,
        slug: String(slug),
        type: String(type),
        masterTemplateId: String(masterTemplateId),
        status: "draft",
        headline: String(headline),
        subheadline: subheadline != null ? String(subheadline) : "",
        heroImageUrl: heroImageUrlSeed,
        sections: Array.isArray(sectionsSeed) ? (sectionsSeed as any) : {},
        formSchema: formSchemaSeed as any,
        ctaText: ctaTextSeed,
        successMessage: successMessageSeed,
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "A page with this slug already exists for this domain." },
        { status: 400 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create page." },
      { status: 500 },
    );
  }

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(
      new URL(`/admin/pages/${page.id}/edit`, req.url),
      303,
    );
  }
  return NextResponse.json({ page }, { status: 201 });
}

