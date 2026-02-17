import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SlugEditor } from "@/components/admin/SlugEditor";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import { TypeEditor } from "@/components/admin/TypeEditor";
import { AddPageDialog } from "@/components/admin/AddPageDialog";

export default async function AdminPagesListPage() {
  const [pages, domains, templates] = await Promise.all([
    prisma.landingPage.findMany({
      include: { domain: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { hostname: "asc" },
      select: { id: true, hostname: true },
    }),
    prisma.masterTemplate.findMany({
      orderBy: { type: "asc" },
      select: { id: true, type: true, name: true },
    }),
  ]);

  type PageWithDomain = (typeof pages)[number];

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
        />
      </div>
      <table className="min-w-full overflow-hidden rounded-lg bg-white text-xs shadow-sm">
        <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.15em] text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">Domain</th>
            <th className="px-3 py-2 text-left">Slug</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Updated</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page: PageWithDomain) => {
            const isMaster =
              page.slug === "master-seller" || page.slug === "master-buyer";
            return (
              <tr key={page.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 text-zinc-700">
                  {page.domain.hostname}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {isMaster ? (
                    <span className="truncate">{page.slug}</span>
                  ) : (
                    <SlugEditor pageId={page.id} initialSlug={page.slug} />
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {isMaster ? (
                    <span className="capitalize">{page.type}</span>
                  ) : (
                    <TypeEditor
                      pageId={page.id}
                      initialType={page.type as "buyer" | "seller"}
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-700">{page.status}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {page.updatedAt.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {isMaster ? (
                    <span className="text-[11px] text-zinc-400">
                      Master template
                    </span>
                  ) : (
                    <div className="inline-flex items-end gap-1">
                      <div className="inline-flex gap-1">
                        <Link
                          href={`/admin/pages/${page.id}/edit`}
                          className="rounded-sm border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100"
                        >
                          Edit
                        </Link>
                        <form
                          action={`/api/admin/pages/duplicate`}
                          method="post"
                        >
                          <input
                            type="hidden"
                            name="pageId"
                            value={page.id}
                          />
                          <button
                            type="submit"
                            className="rounded-sm border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100"
                          >
                            Duplicate
                          </button>
                        </form>
                      </div>
                      <DeletePageButton pageId={page.id} slug={page.slug} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {pages.length === 0 && (
            <tr>
              <td
                className="px-3 py-4 text-center text-zinc-500"
                colSpan={6}
              >
                No pages yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

