import { prisma } from "@/lib/prisma";
import { TemplatesGridWithDialog } from "@/components/admin/TemplatesGridWithDialog";

export default async function AdminDashboardPage() {
  const [domainsCount, pagesCount, leadsCount, templates, domains] =
    await Promise.all([
      prisma.domain.count(),
      prisma.landingPage.count(),
      prisma.lead.count(),
      prisma.masterTemplate.findMany({
        orderBy: { type: "asc" },
        select: { id: true, type: true, name: true },
      }),
      prisma.domain.findMany({
        where: { isActive: true },
        orderBy: { hostname: "asc" },
        select: { id: true, hostname: true },
      }),
    ]);

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
                <p className="text-[11px] font-medium uppercase tracking-[0.18em]">
                  Domains
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {domainsCount}
                </p>
              </div>
              <div className="rounded-full bg-zinc-800 px-3 py-1 text-[16px] font-medium text-zinc-200">
                Routing
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-300">
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
                {pagesCount}
              </p>
            </div>
            <div className="rounded-full bg-zinc-900 px-3 py-1 text-[16px] font-medium text-zinc-50">
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
                {leadsCount}
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-[16px] font-medium text-emerald-700">
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
        <TemplatesGridWithDialog domains={domains} templates={templates} />
      </div>
    </div>
  );
}

