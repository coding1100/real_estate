import { prisma } from "@/lib/prisma";

type DomainDefaultHomepageRow = {
  pageId: string;
  slug: string;
};

function isMissingColumnError(error: unknown): boolean {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;
  return code === "42703";
}

export async function getDomainDefaultHomepageSlug(
  domainId: string,
): Promise<string | null> {
  try {
    const rows = (await prisma.$queryRaw<DomainDefaultHomepageRow[]>`
      SELECT lp."id" AS "pageId", lp."slug" AS "slug"
      FROM "Domain" d
      JOIN "LandingPage" lp ON lp."id" = d."defaultHomepagePageId"
      WHERE d."id" = ${domainId}
        AND lp."status" = 'published'
      LIMIT 1
    `) as DomainDefaultHomepageRow[];
    return rows[0]?.slug ?? null;
  } catch (error) {
    if (!isMissingColumnError(error)) {
      console.error("[defaultHomepage] Failed to resolve default homepage slug", error);
    }
    return null;
  }
}

export async function isFixedDefaultHomepagePage(pageId: string): Promise<boolean> {
  try {
    const rows = (await prisma.$queryRaw<{ id: string }[]>`
      SELECT d."id"
      FROM "Domain" d
      WHERE d."defaultHomepagePageId" = ${pageId}
      LIMIT 1
    `) as { id: string }[];
    return rows.length > 0;
  } catch (error) {
    if (!isMissingColumnError(error)) {
      console.error("[defaultHomepage] Failed to check fixed homepage page", error);
    }
    return false;
  }
}

export async function getFixedHomepagePageIds(): Promise<Set<string>> {
  try {
    const rows = (await prisma.$queryRaw<{ pageId: string }[]>`
      SELECT d."defaultHomepagePageId" AS "pageId"
      FROM "Domain" d
      WHERE d."defaultHomepagePageId" IS NOT NULL
    `) as { pageId: string }[];
    return new Set(rows.map((row) => row.pageId).filter(Boolean));
  } catch (error) {
    if (!isMissingColumnError(error)) {
      console.error("[defaultHomepage] Failed to list fixed homepage ids", error);
    }
    return new Set();
  }
}

export async function validateDefaultHomepageSelection(
  domainId: string,
  pageId: string | null | undefined,
): Promise<string | null> {
  if (!pageId) return null;
  const trimmed = pageId.trim();
  if (!trimmed) return null;

  const rows = (await prisma.$queryRaw<{ id: string }[]>`
    SELECT lp."id"
    FROM "LandingPage" lp
    WHERE lp."id" = ${trimmed}
      AND lp."domainId" = ${domainId}
      AND lp."status" = 'published'
    LIMIT 1
  `) as { id: string }[];

  if (rows.length === 0) {
    throw new Error("Default homepage must be a published page from this domain.");
  }
  return rows[0].id;
}

export type DefaultHomepageButtonItem = {
  id: string;
  slug: string;
  title: string;
  heroImageUrl: string | null;
};

export async function getDefaultHomepageButtons(
  domainId: string,
  excludePageId: string,
): Promise<DefaultHomepageButtonItem[]> {
  let limit = 9;
  try {
    const domainLimitRows = (await prisma.$queryRaw<
      { defaultHomepageButtonLimit: number | null }[]
    >`
      SELECT d."defaultHomepageButtonLimit"
      FROM "Domain" d
      WHERE d."id" = ${domainId}
      LIMIT 1
    `) as { defaultHomepageButtonLimit: number | null }[];
    const requestedLimit = Number(domainLimitRows[0]?.defaultHomepageButtonLimit ?? 9);
    limit = Math.max(
      1,
      Math.min(24, Number.isFinite(requestedLimit) ? requestedLimit : 9),
    );
  } catch (error) {
    if (!isMissingColumnError(error)) {
      console.error("[defaultHomepage] Failed to resolve button limit", error);
    }
  }

  const ordered = (await prisma.$queryRaw<
    {
      id: string;
      slug: string;
      title: string | null;
      headline: string;
      heroImageUrl: string | null;
      adminListOrder: number;
    }[]
  >`
    SELECT lp."id",
           lp."slug",
           lp."title",
           lp."headline",
           lp."heroImageUrl",
           COALESCE(lp."adminListOrder", 0) AS "adminListOrder"
    FROM "LandingPage" lp
    WHERE lp."domainId" = ${domainId}
      AND lp."status" = 'published'
      AND lp."id" <> ${excludePageId}
    ORDER BY COALESCE(lp."adminListOrder", 0) ASC, lp."slug" ASC
    LIMIT ${limit}
  `) as {
    id: string;
    slug: string;
    title: string | null;
    headline: string;
    heroImageUrl: string | null;
    adminListOrder: number;
  }[];

  return ordered.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: (row.title ?? "").trim() || row.headline || row.slug,
    heroImageUrl: row.heroImageUrl ?? null,
  }));
}

