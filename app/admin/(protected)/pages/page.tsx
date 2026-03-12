import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SlugEditor } from "@/components/admin/SlugEditor";
import { TitleEditor } from "@/components/admin/TitleEditor";
import { AddPageDialog } from "@/components/admin/AddPageDialog";
import { PageRowActions } from "@/components/admin/PageRowActions";

export default async function AdminPagesListPage() {
  const [pages, domains] = await Promise.all([
    prisma.landingPage.findMany({
      include: { domain: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { hostname: "asc" },
      select: { id: true, hostname: true },
    }),
  ]);

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

  type PageWithDomain = (typeof pages)[number];
  const pageOptions = pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    type: p.type,
    domainHostname: p.domain.hostname,
    domainId: p.domainId,
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
      <div className="max-[768px]:overflow-x-auto max-[768px]:-mx-2">
        <table className="min-w-full rounded-lg bg-white text-md shadow-sm max-[768px]:min-w-[600px]">
          <thead className="bg-zinc-50 text-[16px] uppercase tracking-[0.15em] text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Domain</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Mode</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Updated</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
        <tbody>
          {pages.map((page: PageWithDomain) => {
            const isMaster =
              page.slug === "master-seller" || page.slug === "master-buyer";
            const multistep = (page as any).multistepStepSlugs as
              | string[]
              | null
              | undefined;
            const isMultistep =
              Array.isArray(multistep) && multistep.length > 0;
            return (
              <tr
                key={page.id}
                className="border-t border-zinc-100 hover:bg-zinc-50/80 transition-colors"
              >
                <td className="px-3 py-3 text-zinc-700">
                  {page.domain.hostname}
                </td>
                <td className="px-3 py-3 text-zinc-700">
                  {isMaster ? (
                    <span className="truncate">{page.slug}</span>
                  ) : (
                    <SlugEditor pageId={page.id} initialSlug={page.slug} />
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-700 max-w-[260px]">
                  {isMaster ? (
                    <span className="truncate">
                      {(page as any).title || page.headline}
                    </span>
                  ) : (
                    <TitleEditor
                      pageId={page.id}
                      initialTitle={
                        ((page as any).title as string | undefined) ||
                        page.headline ||
                        ""
                      }
                    />
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-700">
                  <span className="capitalize">{page.type}</span>
                </td>
                <td className="px-3 py-3 text-zinc-700">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isMultistep
                        ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                        : "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200"
                    }`}
                  >
                    {isMultistep ? "Multistep" : "Single"}
                  </span>
                </td>
                <td className="px-3 py-3 text-zinc-700">{page.status}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {page.updatedAt.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <PageRowActions
                    pageId={page.id}
                    slug={page.slug}
                    isMaster={isMaster}
                  />
                </td>
              </tr>
            );
          })}
          {pages.length === 0 && (
            <tr>
              <td
                className="px-3 py-4 text-center text-zinc-500"
                colSpan={7}
              >
                No pages yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

