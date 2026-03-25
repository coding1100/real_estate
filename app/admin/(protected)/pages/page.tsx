import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AddPageDialog } from "@/components/admin/AddPageDialog";
import { PagesTable, type PageListItem } from "@/components/admin/PagesTable";

export default async function AdminPagesListPage() {
  const pages = await prisma.landingPage.findMany({
    include: { domain: true },
    orderBy: { createdAt: "desc" },
  });

  // Bookmark flag may have been added manually in DB and Prisma client may not
  // be regenerated yet. Read it via SQL to keep /admin/pages accurate.
  const ids = pages.map((p) => p.id);
  let bookmarkedById = new Map<string, boolean>();
  if (ids.length > 0) {
    try {
      const rows = (await prisma.$queryRaw<
        { id: string; bookmarked: boolean }[]
      >`
        SELECT "id", "bookmarked"
        FROM "LandingPage"
        WHERE "id" IN (${Prisma.join(ids)})
      `) as Array<{ id: string; bookmarked: boolean }>;
      bookmarkedById = new Map(rows.map((r) => [r.id, !!r.bookmarked]));
    } catch (err) {
      console.error("[AdminPagesListPage] Failed to load bookmarks via SQL", err);
      bookmarkedById = new Map();
    }
  }

  // Load domains defensively so that if the Domain table is missing
  // or misconfigured in the current database (e.g. Supabase schema
  // not migrated yet), the admin pages list still renders.
  let domains: { id: string; hostname: string }[] = [];
  try {
    domains = await prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { hostname: "asc" },
      select: { id: true, hostname: true },
    });
  } catch (err) {
    console.error(
      "[AdminPagesListPage] Failed to load domains. " +
        "This usually means the Domain table has not been created " +
        "in the current database schema.",
      err,
    );
    domains = [];
  }

  // Load master templates separately so that if the table is missing
  // or misconfigured in the current database (e.g. Supabase schema
  // not migrated yet), the admin pages list still renders.
  let templates: { id: string; type: string; name: string }[] = [];
  try {
    templates = await prisma.masterTemplate.findMany({
      orderBy: { type: "asc" },
      select: { id: true, type: true, name: true },
    });
  } catch (err) {
    console.error(
      "[AdminPagesListPage] Failed to load masterTemplate rows. " +
        "This usually means the MasterTemplate table has not been created " +
        "in the current database schema.",
      err,
    );
    templates = [];
  }

  const pageOptions = pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    type: p.type,
    domainHostname: p.domain.hostname,
    domainId: p.domainId,
  }));

  const tablePages: PageListItem[] = pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    type: p.type,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
    headline: p.headline ?? null,
    title: ((p as any).title as string | null) ?? null,
    domainHostname: p.domain.hostname,
    domainId: p.domainId,
    multistepStepSlugs: ((p as any).multistepStepSlugs as string[] | null) ?? null,
    thumbnailImageUrl:
      (p as any).heroImageUrl ?? (p as any).ogImageUrl ?? null,
    bookmarked: bookmarkedById.get(p.id) ?? false,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          Landing pages
        </h1>
        <AddPageDialog
          domains={domains}
          templates={templates}
          defaultTemplate="buyer"
          pages={pageOptions}
        />
      </div>
      <PagesTable pages={tablePages} />
    </div>
  );
}

