import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageEditor } from "@/components/admin/PageEditor";

type EditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPage({ params }: EditPageProps) {
  const { id } = await params;

  const page = await prisma.landingPage.findUnique({
    where: { id },
    include: { domain: true },
  });

  if (!page) {
    notFound();
  }

  const pageContent = {
    dbId: page.id,
    domainId: page.domainId,
    id: page.id,
    slug: page.slug,
    type: page.type as "buyer" | "seller",
    headline: page.headline,
    subheadline: page.subheadline,
    heroImageUrl: page.heroImageUrl,
    ctaText: page.ctaText,
    successMessage: page.successMessage,
    sections: (page.sections as any) ?? [],
    formSchema: (page.formSchema as any) ?? null,
    domain: {
      hostname: page.domain.hostname,
      displayName: page.domain.displayName,
      logoUrl: page.domain.logoUrl,
      primaryColor: page.domain.primaryColor,
      accentColor: page.domain.accentColor,
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

  return (
    <PageEditor initialPage={pageContent} />
  );
}

