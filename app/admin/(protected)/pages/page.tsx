import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminPagesListPage() {
  const pages = await prisma.landingPage.findMany({
    include: { domain: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          Landing pages
        </h1>
        <Link
          href="/admin/pages/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          New page
        </Link>
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
          {pages.map((page) => (
            <tr key={page.id} className="border-t border-zinc-100">
              <td className="px-3 py-2 text-zinc-700">
                {page.domain.hostname}
              </td>
              <td className="px-3 py-2 text-zinc-700">{page.slug}</td>
              <td className="px-3 py-2 text-zinc-700">{page.type}</td>
              <td className="px-3 py-2 text-zinc-700">{page.status}</td>
              <td className="px-3 py-2 text-zinc-500">
                {page.updatedAt.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-1">
                  <Link
                    href={`/admin/pages/${page.id}/edit`}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100"
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
                      className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100"
                    >
                      Duplicate
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
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

