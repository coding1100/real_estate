import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type {
  LandingPageContent,
  LandingPageType,
} from "@/lib/types/page";
import { BuyerTemplate } from "@/components/templates/BuyerTemplate";
import { SellerTemplate } from "@/components/templates/SellerTemplate";

type RouteParams = {
  params: Promise<{
    type: LandingPageType;
  }>;
};

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { type } = await params;

  const template = await prisma.masterTemplate.findFirst({
    where: { type },
  });

  if (!template) {
    return {
      title: "Template not found",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${template.name} (${type}) – Master template`,
    robots: { index: false, follow: false },
  };
}

export default async function MasterTemplatePreview({
  params,
}: RouteParams) {
  const { type } = await params;

  const template = await prisma.masterTemplate.findFirst({
    where: { type },
  });

  if (!template) {
    notFound();
  }

  const masterSlug = type === "buyer" ? "master-buyer" : "master-seller";
  const basePage = await prisma.landingPage.findFirst({
    where: {
      masterTemplateId: template.id,
      slug: masterSlug,
    },
    select: {
      heroImageUrl: true,
    },
  });

  const domain = await prisma.domain.findFirst({
    where: { isActive: true },
    orderBy: { hostname: "asc" },
  });

  if (!domain) {
    notFound();
  }

  const sections = (template.sections as any) ?? [];
  const formSchema = (template.formSchema as any) ?? null;

  const page: LandingPageContent = {
    id: template.id,
    slug: `master-${type}`,
    type,
    headline: template.name,
    subheadline: null,
    heroImageUrl: basePage?.heroImageUrl ?? null,
    ctaText: "Get Access",
    successMessage: "Thank you!",
    sections: Array.isArray(sections) ? sections : [],
    blocks: [],
    formSchema,
    pageLayout: null,
    domain: {
      hostname: domain.hostname,
      displayName: domain.displayName,
      logoUrl: domain.logoUrl,
      rightLogoUrl: domain.agentPhoto,
      primaryColor: domain.primaryColor,
      accentColor: domain.accentColor,
      ga4Id: domain.ga4Id,
      metaPixelId: domain.metaPixelId,
    },
    seo: {
      title: template.name,
      description: null,
      keywords: null,
      ogImageUrl: null,
      ogType: "website",
      twitterCard: "summary_large_image",
      canonicalUrl: null,
      noIndex: true,
      schemaMarkup: null,
      customHeadTags: null,
    },
  };

  const content =
    type === "seller" ? (
      <SellerTemplate page={page} />
    ) : (
      <BuyerTemplate page={page} />
    );

  return content;
}

