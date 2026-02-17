import { prisma } from "@/lib/prisma";
import { DomainsManager } from "@/components/admin/DomainsManager";

export default async function DomainsPage() {
  const domains = await prisma.domain.findMany({
    orderBy: { hostname: "asc" },
  });

  type DomainRow = (typeof domains)[number];
  const initialDomains = domains.map((d: DomainRow) => ({
    id: d.id || "",
    hostname: d.hostname,
    displayName: d.displayName,
    notifyEmail: d.notifyEmail,
    notifySms: d.notifySms,
    isActive: d.isActive,
    ga4Id: d.ga4Id,
    metaPixelId: d.metaPixelId,
    logoUrl: d.logoUrl,
    rightLogoUrl: d.agentPhoto ?? null,
  }));

  return <DomainsManager initialDomains={initialDomains} />;
}

