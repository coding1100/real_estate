import { prisma } from "@/lib/prisma";
import { DomainsManager } from "@/components/admin/DomainsManager";

export default async function DomainsPage() {
  const domains = await prisma.domain.findMany({
    orderBy: { hostname: "asc" },
  });
  let defaultRows: {
    id: string;
    defaultHomepagePageId: string | null;
    defaultHomepageButtonLimit: number | null;
  }[] = [];
  try {
    defaultRows = await prisma.$queryRaw<
      {
        id: string;
        defaultHomepagePageId: string | null;
        defaultHomepageButtonLimit: number | null;
      }[]
    >`
      SELECT d."id", d."defaultHomepagePageId", d."defaultHomepageButtonLimit"
      FROM "Domain" d
    `;
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;
    if (code !== "42703") {
      throw error;
    }
    const fallbackRows = await prisma.$queryRaw<
      { id: string; defaultHomepagePageId: string | null }[]
    >`
      SELECT d."id", d."defaultHomepagePageId"
      FROM "Domain" d
    `;
    defaultRows = fallbackRows.map((row) => ({
      ...row,
      defaultHomepageButtonLimit: 9,
    }));
  }
  const defaultByDomainId = new Map<
    string,
    { pageId: string | null; buttonLimit: number }
  >(
    defaultRows.map((row) => [
      row.id,
      {
        pageId: row.defaultHomepagePageId ?? null,
        buttonLimit: Number(row.defaultHomepageButtonLimit ?? 9) || 9,
      },
    ]),
  );

  const publishedPages = await prisma.landingPage.findMany({
    where: { status: "published", deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      headline: true,
      domainId: true,
    },
    orderBy: [{ domainId: "asc" }, { adminListOrder: "asc" }, { slug: "asc" }],
  });
  const pageOptionsByDomain = new Map<
    string,
    { id: string; slug: string; label: string }[]
  >();
  for (const page of publishedPages) {
    const current = pageOptionsByDomain.get(page.domainId) ?? [];
    current.push({
      id: page.id,
      slug: page.slug,
      label: (page.title ?? "").trim() || page.headline || page.slug,
    });
    pageOptionsByDomain.set(page.domainId, current);
  }

  type DomainRow = (typeof domains)[number];
  const initialDomains = domains.map((d: DomainRow) => ({
    id: d.id || "",
    hostname: d.hostname,
    displayName: d.displayName,
    notifyEmail: d.notifyEmail,
    notifySms: d.notifySms,
    isActive: d.isActive,
    ga4Id: d.ga4Id,
    metaPixelId: d.metaPixelId,
    logoUrl: d.logoUrl,
    rightLogoUrl: d.agentPhoto ?? null,
    faviconUrl: d.faviconUrl ?? null,
    linkedinUrl: d.linkedinUrl ?? null,
    linkedinVisible: d.linkedinVisible ?? true,
    googleUrl: d.googleUrl ?? null,
    googleVisible: d.googleVisible ?? true,
    facebookUrl: d.facebookUrl ?? null,
    facebookVisible: d.facebookVisible ?? true,
    instagramUrl: d.instagramUrl ?? null,
    instagramVisible: d.instagramVisible ?? true,
    zillowUrl: d.zillowUrl ?? null,
    zillowVisible: d.zillowVisible ?? true,
    defaultHomepagePageId: defaultByDomainId.get(d.id)?.pageId ?? null,
    defaultHomepageButtonLimit: defaultByDomainId.get(d.id)?.buttonLimit ?? 9,
    defaultHomepageOptions: pageOptionsByDomain.get(d.id) ?? [],
  }));

  return <DomainsManager initialDomains={initialDomains} />;
}

