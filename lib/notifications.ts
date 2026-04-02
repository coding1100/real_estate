import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "./prisma";
import { getAdminUiSettings } from "./uiSettings";
import {
  normalizeCtaTitleKey,
  type CtaForwardingRule,
} from "./types/ctaForwarding";
import { cloudinary } from "@/lib/cloudinary";

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

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function inferFileExtensionFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname || "";
    const last = path.split("/").pop() ?? "";
    const cleaned = last.split("?")[0].split("#")[0];
    const ext = cleaned.includes(".") ? cleaned.split(".").pop() ?? "" : "";
    const safe = ext.trim().toLowerCase();
    if (!safe) return "";
    if (!/^[a-z0-9]{1,10}$/.test(safe)) return "";
    return safe;
  } catch {
    return "";
  }
}

function sanitizeFilenameBase(input: string): string {
  const base = String(input ?? "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base || "document";
}

function inferContentTypeFromExtension(ext: string): string | undefined {
  switch (ext.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return undefined;
  }
}

async function fetchAttachmentFromUrl(input: {
  url: string;
  name?: string | null;
  mimeType?: string | null;
  publicId?: string | null;
  format?: string | null;
}): Promise<
  | {
      content: string;
      filename: string;
      content_type?: string;
    }
  | null
> {
  const baseUrl = input.url.trim();
  const tryUrls: string[] = [];
  if (isAbsoluteHttpUrl(baseUrl)) tryUrls.push(baseUrl);

  const publicId = (input.publicId ?? "").trim();
  if (publicId) {
    // Prefer Cloudinary "private download" URLs for raw/PDF assets since
    // standard delivery URLs can be blocked with ACL failure (401).
    try {
      const fmt =
        (input.format ?? "").trim().toLowerCase() ||
        inferFileExtensionFromUrl(baseUrl) ||
        "pdf";
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
      const privateUrl = (cloudinary.utils as any).private_download_url?.(
        publicId,
        fmt,
        {
          resource_type: "raw",
          type: "upload",
          expires_at: expiresAt,
          attachment: false,
        },
      );
      if (typeof privateUrl === "string" && privateUrl.trim()) {
        tryUrls.unshift(privateUrl.trim());
      }
    } catch {
      // fall back to other URLs
    }

    const signedUrl = cloudinary.url(publicId, {
      resource_type: "raw",
      type: "upload",
      secure: true,
      sign_url: true,
      ...(input.format ? { format: String(input.format).trim().toLowerCase() } : {}),
    });
    if (signedUrl && signedUrl !== baseUrl) tryUrls.push(signedUrl);
  }

  let res: Response | null = null;
  for (const u of tryUrls) {
    try {
      const r = await fetch(u, { method: "GET" });
      if (!r.ok) continue;
      res = r;
      break;
    } catch {
      // try next
    }
  }
  if (!res) return null;

  const arrayBuffer = await res.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  const MAX_BYTES = 25 * 1024 * 1024;
  if (bytes.length > MAX_BYTES) return null;

  const extFromUrl = inferFileExtensionFromUrl(baseUrl);
  const baseName = sanitizeFilenameBase(input.name ?? "");
  const filename =
    extFromUrl && !baseName.toLowerCase().endsWith("." + extFromUrl)
      ? `${baseName}.${extFromUrl}`
      : baseName;

  const headerType = res.headers.get("content-type")?.split(";")[0]?.trim();
  const extFromName = inferFileExtensionFromUrl("https://x/" + filename);
  const inferredFromExt = inferContentTypeFromExtension(extFromName);
  const contentType =
    (input.mimeType?.trim() ? input.mimeType.trim() : undefined) ??
    (headerType && headerType.includes("/") ? headerType : undefined) ??
    inferredFromExt;

  return {
    content: bytes.toString("base64"),
    filename,
    ...(contentType ? { content_type: contentType } : {}),
  };
}

function resolveDeliverableDocUrl(input: {
  url: string;
  publicId?: string | null;
  format?: string | null;
}): string {
  const baseUrl = input.url.trim();
  const publicId = (input.publicId ?? "").trim();
  if (!publicId) return baseUrl;
  try {
    const fmt =
      (input.format ?? "").trim().toLowerCase() ||
      inferFileExtensionFromUrl(baseUrl) ||
      "pdf";
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
    const privateUrl = (cloudinary.utils as any).private_download_url?.(
      publicId,
      fmt,
      {
        resource_type: "raw",
        type: "upload",
        expires_at: expiresAt,
        attachment: false,
      },
    );
    if (typeof privateUrl === "string" && privateUrl.trim()) {
      return privateUrl.trim();
    }
  } catch {
    // ignore
  }
  return baseUrl;
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
        const ctaCandidates = collectCtaCandidates(formData);
        console.warn("[notifications] Document email skipped: CTA rule not found", {
          leadId: lead.id,
          pageSlug: page.slug,
          ctaText: page.ctaText,
          ctaCandidates,
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
        const toRecipients = [
          ...new Set(
            notify
              .map((n) => n.email.trim())
              .filter((email) => !!email && email.length > 0),
          ),
        ];

        const finalTo = [
          ...(leadEmail && leadEmail.includes("@") ? [leadEmail.trim()] : []),
          ...(toRecipients.length > 0
            ? toRecipients
            : domain.notifyEmail?.includes("@")
              ? [domain.notifyEmail.trim()]
              : []),
        ].filter((v, idx, arr) => arr.indexOf(v) === idx);

        if (finalTo.length === 0) {
          console.warn("[notifications] Document email skipped: no recipients found", {
            leadId: lead.id,
            pageSlug: page.slug,
          });
        } else {
          const lines = docs.map((d) => {
            const label = d.name?.trim() || d.url;
            const deliverUrl = resolveDeliverableDocUrl({
              url: d.url,
              publicId: (d as any).publicId,
              format: (d as any).format,
            });
            return `- ${label}: ${deliverUrl}`;
          });

          const textBody = [
            `Thank you for your request on ${domain.hostname}.`,
            `Page: ${page.slug}`,
            "",
            "Here are your documents:",
            ...lines,
          ].join("\n");

          const attachments = (
            await Promise.all(
              docs.map((d) =>
                fetchAttachmentFromUrl({
                  url: d.url,
                  name: d.name,
                  mimeType: d.mimeType,
                  publicId: (d as any).publicId,
                  format: (d as any).format,
                }),
              ),
            )
          ).filter(Boolean) as Array<{
            content: string;
            filename: string;
            content_type?: string;
          }>;

          await resend.emails.send({
            from: resolveFromAddress(domain.notifyEmail),
            to: finalTo,
            subject: `Your requested documents from ${domain.displayName ?? domain.hostname}`,
            text: textBody,
            attachments,
          });

          console.log("[notifications] Document email send summary", {
            leadId: lead.id,
            to: finalTo,
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

