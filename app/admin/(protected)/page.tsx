import { prisma } from "@/lib/prisma";
import { Eye } from "lucide-react";

export default async function AdminDashboardPage() {
  const [domains, pages, leads, templates] = await Promise.all([
    prisma.domain.count(),
    prisma.landingPage.count(),
    prisma.lead.count(),
    prisma.masterTemplate.findMany({
      orderBy: { type: "asc" },
    }),
  ]);

  type TemplateItem = (typeof templates)[number];

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Dashboard
      </h1>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Domains card */}
        <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-[1px] shadow-sm">
          <div className="relative h-full rounded-[10px] bg-zinc-950/95 px-4 py-4 text-zinc-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                  Domains
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {domains}
                </p>
              </div>
              <div className="rounded-full bg-zinc-800/70 px-2 py-1 text-[10px] font-medium text-zinc-200">
                Routing
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-400">
              Manage branded hostnames, logos, and tracking IDs.
            </p>
          </div>
        </div>

        {/* Landing pages card */}
        <div className="relative overflow-hidden rounded-sm bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Landing pages
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {pages}
              </p>
            </div>
            <div className="rounded-full bg-zinc-900/90 px-2 py-1 text-[10px] font-medium text-zinc-50">
              Funnels
            </div>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            High-intent funnels across all domains.
          </p>
        </div>

        {/* Leads card */}
        <div className="relative overflow-hidden rounded-sm bg-white p-4 shadow-sm ring-1 ring-emerald-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                Leads
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {leads}
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
              Pipeline
            </div>
          </div>
          <p className="mt-3 text-[11px] text-emerald-800">
            Total inquiries captured from all live campaigns.
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
          {templates.map((tpl: TemplateItem) => (
            <div
              key={tpl.id}
              className="rounded-sm bg-white p-4 shadow-sm"
            >
              <div className="space-y-3">
                {/* Template preview */}
                <div className="flex justify-center">
                  {/* Desktop-style preview inside a clickable preview frame */}
                  <a
                    href={`/${tpl.type === "seller" ? "master-seller" : "master-buyer"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block h-[290px] w-[500px] overflow-hidden rounded-md border border-zinc-200 bg-zinc-50"
                  >
                    <iframe
                      title={`${tpl.name} preview`}
                      src={`/${tpl.type === "seller" ? "master-seller" : "master-buyer"}`}
                      style={{
                        width: "1280px",
                        height: "720px",
                        transform: "scale(0.4)",
                        transformOrigin: "top left",
                      }}
                      className="border-0 pointer-events-none"
                    />
                    {/* Hover/click overlay with eye icon */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow">
                        <Eye className="h-5 w-5" />
                      </div>
                    </div>
                  </a>
                </div>

                {/* Meta + actions */}
                <div className="space-y-1 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                    {tpl.type}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">
                    {tpl.name}
                  </p>
                  <form
                    action="/admin/pages/new"
                    method="get"
                    className="mt-2 inline-block"
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

