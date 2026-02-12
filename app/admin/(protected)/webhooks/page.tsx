import { prisma } from "@/lib/prisma";
import { WebhooksManager } from "@/components/admin/WebhooksManager";

export default async function WebhooksPage() {
  const hooks = await prisma.webhookConfig.findMany({
    orderBy: { createdAt: "desc" },
  });

  const initialWebhooks = hooks.map((h) => ({
    id: h.id,
    name: h.name,
    url: h.url,
    method: h.method ?? "POST",
    isActive: h.isActive,
  }));

  return <WebhooksManager initialWebhooks={initialWebhooks} />;
}

