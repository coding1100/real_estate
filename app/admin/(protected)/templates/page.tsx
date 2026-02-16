import { prisma } from "@/lib/prisma";
import { TemplatesGridWithDialog } from "@/components/admin/TemplatesGridWithDialog";

export default async function TemplatesPage() {
  const [templates, domains] = await Promise.all([
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
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Master templates
      </h1>
      <p className="text-xs text-zinc-500">
        These are locked buyer/seller master templates. Create new landing
        pages by copying from them.
      </p>
      <TemplatesGridWithDialog domains={domains} templates={templates} />
    </div>
  );
}

