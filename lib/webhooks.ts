import { prisma } from "./prisma";

export async function dispatchLeadToWebhooks(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      domain: true,
      page: true,
    },
  });

  if (!lead) return;

  const webhooks = await prisma.webhookConfig.findMany({
    where: { isActive: true },
  });

  if (!webhooks.length) return;

  const payload = {
    id: lead.id,
    createdAt: lead.createdAt,
    type: lead.type,
    status: lead.status,
    formData: lead.formData,
    utm: {
      source: lead.utmSource,
      medium: lead.utmMedium,
      campaign: lead.utmCampaign,
    },
    domain: {
      hostname: lead.domain.hostname,
      displayName: lead.domain.displayName,
    },
    page: {
      slug: lead.page.slug,
      headline: lead.page.headline,
      type: lead.page.type,
    },
  };

  await Promise.all(
    webhooks.map(async (hook) => {
      try {
        const res = await fetch(hook.url, {
          method: hook.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            ...(hook.headers as any),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error(
            `[webhook] Failed for ${hook.name} (${hook.url}): ${res.status}`,
          );
        }
      } catch (e) {
        console.error(
          `[webhook] Error for ${hook.name} (${hook.url})`,
          e,
        );
      }
    }),
  );
}

