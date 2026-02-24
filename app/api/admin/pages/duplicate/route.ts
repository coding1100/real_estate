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
  const slugToUse =
    targetSlug && targetSlug.length > 0
      ? targetSlug
      : `${original.slug}-copy`;

  const copy = await prisma.landingPage.create({
    data: {
      ...original,
      id: undefined as any,
      slug: slugToUse,
      status: "draft",
      domainId: domainIdToUse,
      createdAt: undefined as any,
      updatedAt: undefined as any,
    },
  } as any);

  // Duplicate layout configuration if it exists
  try {
    const originalLayout = await prisma.pageLayout.findUnique({
      where: { pageId },
    });
    if (originalLayout) {
      await prisma.pageLayout.create({
        data: {
          pageId: copy.id,
          layoutData: originalLayout.layoutData,
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

