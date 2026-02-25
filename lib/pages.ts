import { notFound, redirect } from "next/navigation";
import { prisma } from "./prisma";
import type { LandingPageContent } from "./types/page";

const DEFAULT_DEV_HOSTNAME = "bendhomes.us";

type PageRow = Awaited<
  ReturnType<typeof prisma.landingPage.findFirst<{ include: { domain: true } }>>
>;

function pageToContent(
  page: NonNullable<PageRow>,
  pageLayout: { layoutData: unknown } | null,
): LandingPageContent {
  const rawSections = page.sections as any;
  const sections: any[] = Array.isArray(rawSections) ? rawSections : [];
  return {
    id: page.id,
    slug: page.slug,
    type: page.type as LandingPageContent["type"],
    headline: page.headline,
    subheadline: page.subheadline,
    heroImageUrl: page.heroImageUrl,
    ctaText: page.ctaText,
    successMessage: page.successMessage,
    sections,
    formSchema: (page.formSchema as any) ?? null,
    domain: {
      hostname: page.domain.hostname,
      displayName: page.domain.displayName,
      logoUrl: page.domain.logoUrl,
      rightLogoUrl: page.domain.agentPhoto,
      primaryColor: page.domain.primaryColor,
      accentColor: page.domain.accentColor,
      ga4Id: page.domain.ga4Id,
      metaPixelId: page.domain.metaPixelId,
    },
    seo: {
      title: page.seoTitle,
      description: page.seoDescription,
      keywords: (page.seoKeywords as any) ?? null,
      ogImageUrl: page.ogImageUrl,
      ogType: page.ogType,
      twitterCard: page.twitterCard,
      canonicalUrl: page.canonicalUrl,
      noIndex: page.noIndex,
      schemaMarkup: (page.schemaMarkup as any) ?? null,
      customHeadTags: (page.customHeadTags as any) ?? null,
    },
    pageLayout,
  };
}

export async function getLandingPage(
  hostname: string,
  slug: string,
  options?: { allowFallbackToAnyDomain?: boolean },
): Promise<LandingPageContent> {
  let page = await prisma.landingPage.findFirst({
    where: {
      slug,
      status: "published",
      domain: {
        hostname,
        isActive: true,
      },
    },
    include: { domain: true },
  });

  if (
    !page &&
    options?.allowFallbackToAnyDomain &&
    hostname === DEFAULT_DEV_HOSTNAME
  ) {
    page = await prisma.landingPage.findFirst({
      where: {
        slug,
        status: "published",
        domain: { isActive: true },
      },
      include: { domain: true },
    });
  }

  if (!page) {
    notFound();
  }

  if (!page.domain) {
    notFound();
  }

  const stepSlugs = page.multistepStepSlugs as string[] | null;
  if (!stepSlugs || !Array.isArray(stepSlugs) || stepSlugs.length === 0) {
    const pagesWithMultistep = await prisma.landingPage.findMany({
      where: {
        domainId: page.domainId,
        status: "published",
        multistepStepSlugs: { not: null } as any,
      },
      include: { domain: true },
    });
    for (const p of pagesWithMultistep) {
      const arr = p.multistepStepSlugs as string[] | null;
      if (Array.isArray(arr) && arr.includes(slug) && p.slug !== slug) {
        redirect("/" + p.slug);
      }
    }
  }

  let pageLayout: { layoutData: unknown } | null = null;
  try {
    const layout = await prisma.pageLayout.findUnique({
      where: { pageId: page.id },
    });
    if (layout) pageLayout = { layoutData: layout.layoutData };
  } catch {
    // PageLayout table may not exist if migration has not been applied
  }

  const content = pageToContent(page, pageLayout);

  if (stepSlugs && Array.isArray(stepSlugs) && stepSlugs.length > 0) {
    const steps: LandingPageContent[] = [];
    for (const stepSlug of stepSlugs) {
      const stepPage = await prisma.landingPage.findFirst({
        where: {
          slug: stepSlug,
          domainId: page.domainId,
          status: "published",
        },
        include: { domain: true },
      });
      if (!stepPage?.domain) continue;
      let stepLayout: { layoutData: unknown } | null = null;
      try {
        const sl = await prisma.pageLayout.findUnique({
          where: { pageId: stepPage.id },
        });
        if (sl) stepLayout = { layoutData: sl.layoutData };
      } catch {
        // ignore
      }
      steps.push(pageToContent(stepPage, stepLayout));
    }
    content.multistepSteps = steps;
  }

  return content;
}

