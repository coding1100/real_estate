import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let pageId: string | null = null;
  let targetDomainId: string | null = null;
  let targetSlug: string | null = null;
  let targetType: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (body) {
      pageId = body.pageId ? String(body.pageId) : null;
      if (body.domainId) {
        targetDomainId = String(body.domainId);
      }
      if (body.slug) {
        const trimmed = String(body.slug).trim();
        targetSlug = trimmed.length > 0 ? trimmed : null;
      }
      if (body.type) {
        const t = String(body.type).trim().toLowerCase();
        if (t === "buyer" || t === "seller") {
          targetType = t;
        }
      }
    }
  } else {
    const formData = await req.formData().catch(() => null);
    if (formData) {
      const rawId = formData.get("pageId");
      pageId = rawId != null ? String(rawId) : null;
      const rawDomain = formData.get("domainId");
      if (rawDomain != null) {
        targetDomainId = String(rawDomain);
      }
      const rawSlug = formData.get("slug");
      if (rawSlug != null) {
        const trimmed = String(rawSlug).trim();
        targetSlug = trimmed.length > 0 ? trimmed : null;
      }
      const rawType = formData.get("type");
      if (rawType != null) {
        const t = String(rawType).trim().toLowerCase();
        if (t === "buyer" || t === "seller") {
          targetType = t;
        }
      }
    }
  }

  if (!pageId) {
    return NextResponse.json(
      { error: "Missing pageId" },
      { status: 400 },
    );
  }

  const original = await prisma.landingPage.findUnique({
    where: { id: pageId },
  });
  if (!original) {
    return NextResponse.json(
      { error: "Page not found" },
      { status: 404 },
    );
  }

  const domainIdToUse = targetDomainId ?? original.domainId;

  const normalizedSlug =
    typeof targetSlug === "string" ? targetSlug.trim().toLowerCase() : "";

  // Require an explicit, non-empty slug when duplicating.
  if (!normalizedSlug) {
    return NextResponse.json(
      { error: "Slug for new page is required." },
      { status: 400 },
    );
  }

  // Enforce global uniqueness for the requested slug – we do not auto-adjust
  // when the user has chosen a specific slug.
  const conflict = await prisma.landingPage.findFirst({
    where: {
      slug: normalizedSlug,
    },
    select: { id: true },
  });
  if (conflict) {
    return NextResponse.json(
      {
        error:
          "A page with this slug already exists. Please choose a different slug.",
      },
      { status: 400 },
    );
  }

  const slugToUse = normalizedSlug;

  const {
    id: _id,
    slug: _slug,
    domainId: _domainId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    sections,
    formSchema,
    multistepStepSlugs,
    seoKeywords,
    schemaMarkup,
    customHeadTags,
    ...rest
  } = original as any;

  const copy = await prisma.landingPage.create({
    data: {
      ...rest,
      type: (targetType as any) ?? rest.type,
      sections: sections as any,
      formSchema: formSchema as any,
      multistepStepSlugs: multistepStepSlugs as any,
      seoKeywords: seoKeywords as any,
      schemaMarkup: schemaMarkup as any,
      customHeadTags: customHeadTags as any,
      slug: slugToUse,
      status: "draft",
      domainId: domainIdToUse,
    },
  });

  // Duplicate layout configuration if it exists
  try {
    const originalLayout = await prisma.pageLayout.findUnique({
      where: { pageId },
    });
    if (originalLayout) {
      await prisma.pageLayout.create({
        data: {
          pageId: copy.id,
          layoutData: originalLayout.layoutData as any,
        },
      });
    }
  } catch (e) {
    // If PageLayout table doesn't exist or duplication fails,
    // we still return the duplicated page without layout.
    console.error("Failed to duplicate page layout", e);
  }

  return NextResponse.json({ page: copy }, { status: 201 });
}

