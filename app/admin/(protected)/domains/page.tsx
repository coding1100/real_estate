import { prisma } from "@/lib/prisma";
import { DomainsManager } from "@/components/admin/DomainsManager";

export default async function DomainsPage() {
  const domains = await prisma.domain.findMany({
    orderBy: { hostname: "asc" },
  });

  const initialDomains = domains.map((d) => ({
    id: d.id || "",
    hostname: d.hostname,
    displayName: d.displayName,
    notifyEmail: d.notifyEmail,
    notifySms: d.notifySms,
    isActive: d.isActive,
    ga4Id: d.ga4Id,
    metaPixelId: d.metaPixelId,
  }));

  return <DomainsManager initialDomains={initialDomains} />;
}

