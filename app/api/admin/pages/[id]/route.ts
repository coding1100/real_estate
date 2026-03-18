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
  let existingPage;
  try {
    existingPage = await prisma.landingPage.findUnique({
      where: { id },
      select: { domainId: true },
    });
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? ((error as { code: string }).code)
        : null;

    if (code === "ETIMEDOUT") {
      console.error(
        "[pages] prisma.landingPage.findUnique timed out while loading page for PATCH",
        { id, error },
      );
      return NextResponse.json(
        {
          error:
            "The database request timed out while loading this page. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    console.error(
      "[pages] prisma.landingPage.findUnique failed while loading page for PATCH",
      { id, error },
    );
    return NextResponse.json(
      { error: "Failed to load page from the database." },
      { status: 500 },
    );
  }
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
    const normalizedSlug = body.slug.trim().toLowerCase();

    // Enforce global uniqueness: slug must be unique across all domains/pages.
    const existing = await prisma.landingPage.findFirst({
      where: {
        slug: normalizedSlug,
        NOT: { id },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "A page with this slug already exists. Please choose a different slug.",
        },
        { status: 400 },
      );
    }

    body.slug = normalizedSlug;
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
        } else {
          // If no hero section exists (rare), create one so social overrides persist.
          sections.push({
            id: "hero",
            kind: "hero",
            props: { socialOverrides },
          });
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

    // Bookmark toggle: update via SQL so it works even if Prisma client
    // hasn't been regenerated yet after a manual DB ALTER TABLE.
    if (Object.prototype.hasOwnProperty.call(body, "bookmarked")) {
      if (typeof body.bookmarked !== "boolean") {
        return NextResponse.json(
          { error: "bookmarked must be a boolean." },
          { status: 400 },
        );
      }
      await prisma.$executeRaw`
        UPDATE "LandingPage"
        SET "bookmarked" = ${body.bookmarked}, "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
      delete body.bookmarked;
    }

    // Update the page
    const page =
      Object.keys(body).length > 0
        ? await prisma.landingPage.update({
            where: { id },
            data: {
              ...body,
            },
          })
        : await prisma.landingPage.findUniqueOrThrow({ where: { id } });

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
          console.log(
            "[revalidate] Also invalidating domain path:",
            `/${domain.hostname}/${page.slug}`,
          );
          revalidatePath(`/${domain.hostname}/${page.slug}`);
        }
      } catch (error: unknown) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
            ? ((error as { code: string }).code)
            : null;

        if (code === "ETIMEDOUT") {
          console.error(
            "[revalidate] prisma.domain.findUnique timed out while loading domain for cache invalidation",
            { domainId: page.domainId, slug: page.slug, error },
          );
        } else {
          console.error(
            "[revalidate] prisma.domain.findUnique failed while loading domain for cache invalidation",
            { domainId: page.domainId, slug: page.slug, error },
          );
        }
        // Do not fail the PATCH response if cache invalidation for the domain path fails.
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
    // Load the page to get its slug.
    const pageToDelete = await prisma.landingPage.findUnique({
      where: { id },
      select: { slug: true },
    });

    // If we have a slug, scan for any entry pages whose multistepStepSlugs
    // array includes this slug. We do this filtering in application code to
    // avoid relying on provider-specific JSON operators.
    if (pageToDelete?.slug) {
      const potentialReferrers = await prisma.landingPage.findMany({
        // We intentionally avoid provider-specific JSON filters here and
        // perform the null/array checks in application code below.
        select: {
          id: true,
          slug: true,
          multistepStepSlugs: true,
        },
      });

      const usedInMultistep = potentialReferrers.filter((p) => {
        const slugs = (p.multistepStepSlugs as any) as string[] | null;
        return Array.isArray(slugs) && slugs.includes(pageToDelete.slug);
      });

      if (usedInMultistep.length > 0) {
        return NextResponse.json(
          {
            error:
              "This page is used in a multistep flow. Remove it from all multistep flows before deleting.",
          },
          { status: 400 },
        );
      }
    }

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

