import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [domains, pages, leads, templates] = await Promise.all([
    prisma.domain.count(),
    prisma.landingPage.count(),
    prisma.lead.count(),
    prisma.masterTemplate.findMany({
      orderBy: { type: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Dashboard
      </h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Domains</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {domains}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Landing Pages</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {pages}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Leads</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {leads}
          </p>
        </div>
      </div>

      {/* Master templates section (same layout as /admin/templates) */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Master templates
        </h2>
        <p className="text-xs text-zinc-500">
          These are locked buyer/seller master templates. Create new landing
          pages by copying from them.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-lg bg-white p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                {tpl.type}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">
                {tpl.name}
              </p>
              <form
                action="/admin/pages/new"
                method="get"
                className="mt-4"
              >
                <input type="hidden" name="template" value={tpl.type} />
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Create page from template
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

