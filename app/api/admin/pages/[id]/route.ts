import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = await ctx.params;

  // Basic validation for slug updates
  if (Object.prototype.hasOwnProperty.call(body, "slug")) {
    if (typeof body.slug !== "string" || body.slug.trim().length === 0) {
      return NextResponse.json(
        { error: "Slug cannot be empty." },
        { status: 400 },
      );
    }
    body.slug = body.slug.trim();
  }

  try {
    // Extract layout data if provided
    const layoutData = body.layoutData;
    delete body.layoutData;

    console.log("[PATCH] Updating page:", id);
    console.log("[PATCH] Body keys:", Object.keys(body));
    console.log("[PATCH] Headline:", body.headline);

    // Update the page
    const page = await prisma.landingPage.update({
      where: { id },
      data: {
        ...body,
      },
    });

    console.log("[PATCH] Updated page:", page.slug, "headline:", page.headline);

    if (layoutData && Array.isArray(layoutData) && layoutData.length > 0) {
      await prisma.pageLayout.upsert({
        where: { pageId: id },
        update: { layoutData: layoutData },
        create: { pageId: id, layoutData: layoutData },
      });
    }

    // Revalidate the page cache so changes appear immediately on frontend
    console.log("[revalidate] Triggering cache invalidation for:", page.slug);
    if (page.slug) {
      // Revalidate the slug path
      revalidatePath(`/${page.slug}`);
      revalidatePath("/");
      // Also try domain-specific paths
      revalidatePath(`/${page.slug}`);
    }

    // Also need to revalidate the domain page if it exists
    if (page.domainId) {
      try {
        const domain = await prisma.domain.findUnique({
          where: { id: page.domainId },
        });
        if (domain) {
          console.log("[revalidate] Also invalidating domain path:", `/${domain.hostname}/${page.slug}`);
          revalidatePath(`/${domain.hostname}/${page.slug}`);
        }
      } catch (e) {
        // ignore domain lookup errors
      }
    }
    console.log("[revalidate] Cache invalidation complete");

    return NextResponse.json({ page }, { status: 200 });
  } catch (err: any) {
    // Handle unique constraint violation on (domainId, slug)
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Slug already exists for this domain." },
        { status: 400 },
      );
    }

    console.error(err);
    return NextResponse.json(
      { error: "Failed to update page." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    await prisma.$transaction([
      prisma.lead.deleteMany({ where: { pageId: id } }),
      prisma.pageLayout.deleteMany({ where: { pageId: id } }),
      prisma.landingPage.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          "Failed to delete page. There may be related data blocking delete.",
      },
      { status: 500 },
    );
  }
}

