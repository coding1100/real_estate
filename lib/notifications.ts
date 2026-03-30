import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "./prisma";
import { getAdminUiSettings } from "./uiSettings";
import {
  normalizeCtaTitleKey,
  type CtaForwardingRule,
} from "./types/ctaForwarding";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL ?? "").trim();
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

function extractLeadEmail(formData: unknown): string | null {
  const seen = new Set<unknown>();
  let firstEmailLikeValue: string | null = null;
  function search(node: unknown): string | null {
    if (!node || typeof node !== "object") return null;
    if (seen.has(node)) return null;
    seen.add(node);
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        const nested = search(value);
        if (nested) return nested;
        continue;
      }
      if (typeof value !== "string") continue;
      const raw = value.trim();
      if (!raw) continue;
      const normalizedKey = key.toLowerCase();
      const looksLikeEmailKey =
        normalizedKey === "email" ||
        normalizedKey === "e" ||
        normalizedKey.endsWith("email") ||
        normalizedKey.includes("email");
      const looksLikeEmailValue = /\S+@\S+\.\S+/.test(raw);
      if (!firstEmailLikeValue && looksLikeEmailValue) {
        firstEmailLikeValue = raw;
      }
      if (looksLikeEmailKey && looksLikeEmailValue) {
        return raw;
      }
    }
    return null;
  }
  const exact = search(formData);
  // Fallback: if form uses compact ids (e.g. "e"), use the first email-like value.
  return exact || firstEmailLikeValue;
}

function resolveFromAddress(fallback?: string | null): string {
  if (RESEND_FROM_EMAIL) return RESEND_FROM_EMAIL;
  if (fallback && /\S+@\S+\.\S+/.test(fallback)) return fallback;
  return "leads@no-reply.example.com";
}

export async function sendLeadNotifications(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      domain: true,
      page: true,
    },
  });

  if (!lead) return;

  const { domain, page } = lead;

  // Email to agent via Resend
  if (resend && domain.notifyEmail) {
    try {
      const subject = `[New ${lead.type} lead] ${domain.hostname} / ${page.slug}`;
      const lines: string[] = [];
      const data = lead.formData as Record<string, unknown>;

      Object.keys(data || {}).forEach((key) => {
        if (["recaptchaToken", "website"].includes(key)) return;
        const value = data[key];
        lines.push(`${key}: ${String(value)}`);
      });

      const textBody = [
        `New ${lead.type} lead from ${domain.hostname}`,
        `Page: ${page.slug}`,
        "",
        ...lines,
      ].join("\n");

      await resend.emails.send({
        from: resolveFromAddress(domain.notifyEmail),
        to: domain.notifyEmail,
        subject,
        text: textBody,
      });
    } catch (e) {
      console.error("[notifications] Failed to send email", e);
    }
  }

  // Email documents to lead + CC/BCC from CTA Notification emails
  if (resend) {
    try {
      const leadEmail = extractLeadEmail(lead.formData);
      if (!leadEmail) {
        console.warn("[notifications] Lead email not found in formData. Will still send docs to configured CC/BCC recipients.", {
          leadId: lead.id,
          pageSlug: page.slug,
        });
      }

      const { settings } = await getAdminUiSettings();
      const rules = (settings.ctaForwardingRules ?? []) as CtaForwardingRule[];
      const normalizedPageCta = normalizeCtaTitleKey(page.ctaText ?? "");
      const rule = rules.find(
        (r) => normalizeCtaTitleKey(r.ctaTitle) === normalizedPageCta,
      );
      if (!rule) {
        console.warn("[notifications] Document email skipped: CTA rule not found", {
          leadId: lead.id,
          pageSlug: page.slug,
          ctaText: page.ctaText,
        });
      }
      const docs = (rule?.documents ?? []).filter(
        (d) => d.url && d.autoSend !== false,
      );
      if (docs.length === 0) {
        console.warn("[notifications] Document email skipped: no auto-send docs", {
          leadId: lead.id,
          pageSlug: page.slug,
        });
      }
      if (docs.length > 0) {
        const notify = (rule?.notifyEmails ?? []).filter(
          (n) => (n.enabled ?? true) && n.email && n.email.includes("@"),
        );
        const cc = notify
          .filter((n) => n.kind === "cc")
          .map((n) => n.email);
        const bcc = notify
          .filter((n) => n.kind !== "cc")
          .map((n) => n.email);

        // Send independently to each target recipient so one bad address does not
        // prevent others from getting the documents.
        const recipientSet = new Set<string>();
        if (leadEmail) recipientSet.add(leadEmail);
        cc.forEach((email) => recipientSet.add(email));
        bcc.forEach((email) => recipientSet.add(email));
        const recipients = [...recipientSet];

        if (recipients.length === 0) {
          console.warn("[notifications] Document email skipped: no recipients found", {
            leadId: lead.id,
            pageSlug: page.slug,
          });
        } else {
          const lines = docs.map((d) => {
            const label = d.name?.trim() || d.url;
            return `- ${label}: ${d.url}`;
          });

          const textBody = [
            `Thank you for your request on ${domain.hostname}.`,
            `Page: ${page.slug}`,
            "",
            "Here are your documents:",
            ...lines,
          ].join("\n");

          const attachments = docs.map((d) => ({
            filename: d.name?.trim() || "document",
            path: d.url,
            contentType: d.mimeType,
          }));

          const sendResults = await Promise.allSettled(
            recipients.map((to) =>
              resend.emails.send({
                from: resolveFromAddress(domain.notifyEmail),
                to,
                subject: `Your requested documents from ${domain.displayName ?? domain.hostname}`,
                text: textBody,
                attachments,
              }),
            ),
          );

          const failures = sendResults
            .map((r, i) => ({ result: r, to: recipients[i] }))
            .filter((x) => x.result.status === "rejected");
          console.log("[notifications] Document email send summary", {
            leadId: lead.id,
            recipients,
            docsCount: docs.length,
            successCount: sendResults.length - failures.length,
            failedCount: failures.length,
          });
          if (failures.length > 0) {
            console.error(
              "[notifications] Document email failures",
              failures.map((f) => ({
                to: f.to,
                reason:
                  f.result.status === "rejected"
                    ? String(f.result.reason)
                    : undefined,
              })),
            );
          }
        }
      }
    } catch (e) {
      console.error("[notifications] Failed to send lead documents", e);
    }
  }

  // SMS to agent via Twilio
  if (twilioClient && TWILIO_FROM_NUMBER && domain.notifySms) {
    try {
      await twilioClient.messages.create({
        from: TWILIO_FROM_NUMBER,
        to: domain.notifySms,
        body: `New ${lead.type} lead from ${domain.hostname} / ${page.slug}`,
      });
    } catch (e) {
      console.error("[notifications] Failed to send SMS", e);
    }
  }
}

