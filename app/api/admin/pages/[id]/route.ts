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
  const existingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: { domainId: true },
  });
  if (!existingPage) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  // Basic validation for slug updates
  if (Object.prototype.hasOwnProperty.call(body, "slug")) {
    if (typeof body.slug !== "string" || body.slug.trim().length === 0) {
      return NextResponse.json(
        { error: "Slug cannot be empty." },
        { status: 400 },
      );
    }
    body.slug = body.slug.trim();

    const targetDomainId =
      typeof body.domainId === "string" && body.domainId.trim().length > 0
        ? body.domainId.trim()
        : existingPage.domainId;

    // Enforce slug uniqueness only within the target domain.
    const existing = await prisma.landingPage.findFirst({
      where: {
        slug: body.slug,
        domainId: targetDomainId,
        NOT: { id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A page with this slug already exists for this domain." },
        { status: 400 },
      );
    }
  }

  try {
    // If we are renaming the legacy /strategy-call page and it uses the
    // Next steps layout without an explicit profile-only flag, backfill
    // that flag into the hero section so the layout stays stable after rename.
    if (typeof body.slug === "string") {
      const existing = await prisma.landingPage.findUnique({
        where: { id },
        select: { slug: true, sections: true },
      });
      if (existing && existing.slug === "strategy-call") {
        const rawSections = existing.sections as any;
        const sections: any[] = Array.isArray(rawSections)
          ? rawSections
          : [];
        const heroIdx = sections.findIndex((s) => s && s.kind === "hero");
        if (heroIdx !== -1) {
          const hero = sections[heroIdx] || {};
          const props = (hero.props || {}) as any;
          if (
            props.formStyle === "next-steps" &&
            typeof props.nextStepsSecondOnly === "undefined"
          ) {
            const updatedHero = {
              ...hero,
              props: {
                ...props,
                nextStepsSecondOnly: true,
              },
            };
            sections[heroIdx] = updatedHero;
            if (!Object.prototype.hasOwnProperty.call(body, "sections")) {
              body.sections = sections;
            }
          }
        }
      }
    }

    // Extract layout data if provided
    const layoutData = body.layoutData;
    delete body.layoutData;

    // Persist per-page social icon overrides into the hero section props
    if (Object.prototype.hasOwnProperty.call(body, "socialOverrides")) {
      const socialOverrides = body.socialOverrides;
      try {
        const existing = await prisma.landingPage.findUnique({
          where: { id },
          select: { sections: true },
        });
        const rawSections = (body.sections ?? existing?.sections) as any;
        const sections: any[] = Array.isArray(rawSections) ? [...rawSections] : [];
        const heroIdx = sections.findIndex((s) => s && s.kind === "hero");
        if (heroIdx !== -1) {
          const hero = sections[heroIdx] || {};
          sections[heroIdx] = {
            ...hero,
            props: {
              ...(hero.props || {}),
              socialOverrides,
            },
          };
          body.sections = sections;
        }
      } catch {
        // ignore failures; fall back to saving without social overrides
      }
      delete body.socialOverrides;
    }

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

