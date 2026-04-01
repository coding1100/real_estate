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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isInternalFieldKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "recaptchatoken") return true;
  if (normalized === "website") return true;
  if (normalized === "_multistepdata") return true;
  if (normalized === "_ctatext") return true;
  if (normalized.includes("cta")) return true;
  return false;
}

function flattenLeadFormDataForEmail(
  input: Record<string, unknown>,
  path = "",
): string[] {
  const lines: string[] = [];
  for (const [rawKey, value] of Object.entries(input)) {
    if (isInternalFieldKey(rawKey)) continue;
    const key = path ? `${path}.${rawKey}` : rawKey;
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      const printable = value
        .map((item) =>
          typeof item === "string" || typeof item === "number" || typeof item === "boolean"
            ? String(item)
            : JSON.stringify(item),
        )
        .join(", ");
      if (printable) lines.push(`${key}: ${printable}`);
      continue;
    }
    if (isPlainObject(value)) {
      lines.push(...flattenLeadFormDataForEmail(value, key));
      continue;
    }
    lines.push(`${key}: ${String(value)}`);
  }
  return lines;
}

function collectCtaCandidates(formData: Record<string, unknown>): string[] {
  const candidates = new Set<string>();
  const direct = formData._ctaText;
  if (typeof direct === "string" && direct.trim()) {
    candidates.add(direct.trim());
  }
  const visit = (node: unknown) => {
    if (!isPlainObject(node) && !Array.isArray(node)) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string" && key.toLowerCase().includes("cta") && value.trim()) {
        candidates.add(value.trim());
      } else if (isPlainObject(value) || Array.isArray(value)) {
        visit(value);
      }
    }
  };
  visit(formData);
  return [...candidates];
}

function findCtaRule(
  rules: CtaForwardingRule[],
  pageCtaText: string | null | undefined,
  formData: Record<string, unknown>,
): CtaForwardingRule | undefined {
  const keys = new Set<string>();
  const pageKey = normalizeCtaTitleKey(pageCtaText ?? "");
  if (pageKey) keys.add(pageKey);
  for (const candidate of collectCtaCandidates(formData)) {
    const key = normalizeCtaTitleKey(candidate);
    if (key) keys.add(key);
  }
  for (const key of keys) {
    const match = rules.find((r) => normalizeCtaTitleKey(r.ctaTitle) === key);
    if (match) return match;
  }
  return undefined;
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
      const data = (lead.formData as Record<string, unknown>) ?? {};
      const lines = flattenLeadFormDataForEmail(data);

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
      const formData = (lead.formData as Record<string, unknown>) ?? {};
      const rule = findCtaRule(rules, page.ctaText, formData);
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

        const to = leadEmail ? [leadEmail] : [];

        if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
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

          await resend.emails.send({
            from: resolveFromAddress(domain.notifyEmail),
            ...(to.length ? { to } : {}),
            ...(cc.length ? { cc } : {}),
            ...(bcc.length ? { bcc } : {}),
            subject: `Your requested documents from ${domain.displayName ?? domain.hostname}`,
            text: textBody,
            attachments,
          });

          console.log("[notifications] Document email send summary", {
            leadId: lead.id,
            to,
            cc,
            bcc,
            docsCount: docs.length,
            successCount: 1,
            failedCount: 0,
          });
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

