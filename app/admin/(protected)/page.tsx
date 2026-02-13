import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [domains, pages, leads] = await Promise.all([
    prisma.domain.count(),
    prisma.landingPage.count(),
    prisma.lead.count(),
  ]);

  return (
    <div className="space-y-6">
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
    </div>
  );
}

