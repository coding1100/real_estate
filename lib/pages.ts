import { notFound } from "next/navigation";
import { prisma } from "./prisma";
import type { LandingPageContent } from "./types/page";

const DEFAULT_DEV_HOSTNAME = "bendhomes.us";

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
    include: {
      domain: true,
    },
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
  };
}

