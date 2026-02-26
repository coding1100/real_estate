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
    // Helpful flag for tools like Zapier to know this might be a multistep payload
    meta: {
      isMultistep:
        !!lead.formData &&
        typeof lead.formData === "object" &&
        Object.keys(lead.formData as Record<string, unknown>).some((key) =>
          /^step\d+$/.test(key),
        ),
      stepsCount:
        !!lead.formData && typeof lead.formData === "object"
          ? Object.keys(lead.formData as Record<string, unknown>).filter((key) =>
              /^step\d+$/.test(key),
            ).length
          : 0,
    },
  };

  const zapierUrl = process.env.ZAPIER_LEADS_WEBHOOK_URL;

  const webhookCalls: Promise<unknown>[] = [];

  if (webhooks.length) {
    webhookCalls.push(
      ...webhooks.map(async (hook) => {
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

  if (zapierUrl) {
    webhookCalls.push(
      (async () => {
        try {
          const res = await fetch(zapierUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            console.error(
              `[zapier] Failed webhook (${zapierUrl}): ${res.status}`,
            );
          } else {
            console.log("[zapier] Lead sent successfully");
          }
        } catch (e) {
          console.error(`[zapier] Error calling webhook (${zapierUrl})`, e);
        }
      })(),
    );
  }

  if (webhookCalls.length) {
    await Promise.all(webhookCalls);
  }
}

