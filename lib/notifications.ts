import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "./prisma";
import { getAdminUiSettings } from "./uiSettings";
import {
  normalizeCtaTitleKey,
  type CtaForwardingRule,
} from "./types/ctaForwarding";
import { cloudinary } from "@/lib/cloudinary";
import {
  formLinesToFieldRows,
  renderDocumentDeliveryEmailHtml,
  renderNewLeadEmailHtml,
} from "@/lib/email-render";

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

function isInternalFieldKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "recaptchatoken") return true;
  if (normalized === "website") return true;
  if (normalized === "_multistepdata") return true;
  if (normalized === "_ctatext") return true;
  if (normalized === "_stepslug") return true;
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

function normalizeTemplateVariableKey(raw: string): string {
  const normalized = String(raw ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  if (!normalized) return "";
  if (/^[0-9]/.test(normalized)) return `field_${normalized}`;
  return normalized;
}

function toTemplateVariableString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (
          typeof entry === "string" ||
          typeof entry === "number" ||
          typeof entry === "boolean"
        ) {
          return String(entry).trim();
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const clean = fullName.trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", lastName: "" };
  const parts = clean.split(" ");
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ").trim();
  return { firstName, lastName };
}

function extractTemplateVariablesFromFormData(
  formData: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const seen = new Set<unknown>();

  const assignKey = (key: string, value: unknown) => {
    const normalized = normalizeTemplateVariableKey(key);
    if (!normalized) return;
    if (isInternalFieldKey(normalized)) return;
    const printable = toTemplateVariableString(value);
    if (!printable) return;
    if (!Object.prototype.hasOwnProperty.call(out, normalized)) {
      out[normalized] = printable;
    }
  };

  const visit = (node: unknown, pathParts: string[] = []) => {
    if (node == null) return;
    if (typeof node !== "object") {
      if (pathParts.length > 0) {
        assignKey(pathParts.join("_"), node);
        assignKey(pathParts[pathParts.length - 1] ?? "", node);
      }
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      if (pathParts.length > 0) {
        assignKey(pathParts.join("_"), node);
        assignKey(pathParts[pathParts.length - 1] ?? "", node);
      }
      node.forEach((entry, idx) => {
        if (isPlainObject(entry) || Array.isArray(entry)) {
          visit(entry, [...pathParts, String(idx + 1)]);
        }
      });
      return;
    }

    for (const [rawKey, value] of Object.entries(node as Record<string, unknown>)) {
      if (isInternalFieldKey(rawKey)) continue;
      const nextPath = [...pathParts, rawKey];
      if (isPlainObject(value) || Array.isArray(value)) {
        visit(value, nextPath);
        continue;
      }
      assignKey(nextPath.join("_"), value);
      assignKey(rawKey, value);
    }
  };

  visit(formData);

  const fullName =
    out.full_name ||
    out.name ||
    out.fullname ||
    toTemplateVariableString((formData as Record<string, unknown>).name);

  if (fullName) {
    out.full_name = fullName;
    if (!out.name) out.name = fullName;
  }

  if (!out.first_name || !out.last_name) {
    const { firstName, lastName } = splitFullName(fullName || "");
    if (!out.first_name && firstName) out.first_name = firstName;
    if (!out.last_name && lastName) out.last_name = lastName;
  }

  if (!out.first_name) out.first_name = "there";

  return out;
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

function extractStepSlugFromFormData(formData: Record<string, unknown>): string | null {
  const direct = formData._stepSlug;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const visit = (node: unknown): string | null => {
    if (!isPlainObject(node) && !Array.isArray(node)) return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = visit(item);
        if (hit) return hit;
      }
      return null;
    }
    for (const [key, value] of Object.entries(node)) {
      const normalizedKey = key.trim().toLowerCase();
      if (
        typeof value === "string" &&
        (normalizedKey === "_stepslug" || normalizedKey === "stepslug" || normalizedKey === "_step_slug")
      ) {
        const v = value.trim();
        if (v) return v;
      }
      if (isPlainObject(value) || Array.isArray(value)) {
        const hit = visit(value);
        if (hit) return hit;
      }
    }
    return null;
  };

  return visit(formData);
}

/** Split CTA notification emails into Resend to/cc/bcc. Default kind is cc. */
function buildDocumentRecipients(
  leadEmail: string | null | undefined,
  notify: Array<{ email: string; kind?: "cc" | "bcc" }>,
  domainNotify: string | null | undefined,
): { to: string[]; cc: string[]; bcc: string[] } | null {
  const norm = (s: string) => s.trim().toLowerCase();

  const rawCc: string[] = [];
  const rawBcc: string[] = [];
  for (const n of notify) {
    const e = n.email.trim();
    if (!e.includes("@")) continue;
    const kind = n.kind ?? "cc";
    if (kind === "bcc") rawBcc.push(e);
    else rawCc.push(e);
  }

  const dedupe = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      const t = x.trim();
      const k = norm(t);
      if (!t || seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  };

  const bccNorm = new Set(rawBcc.map(norm));
  const ccOnly = dedupe(rawCc.filter((e) => !bccNorm.has(norm(e))));
  const bccOnly = dedupe(rawBcc);

  const domain =
    domainNotify && domainNotify.includes("@") ? domainNotify.trim() : null;

  if (leadEmail && leadEmail.includes("@")) {
    const lead = leadEmail.trim();
    const ln = norm(lead);
    return {
      to: [lead],
      cc: ccOnly.filter((e) => norm(e) !== ln),
      bcc: bccOnly.filter((e) => norm(e) !== ln),
    };
  }

  if (ccOnly.length > 0) {
    const primary = ccOnly[0];
    const pn = norm(primary);
    return {
      to: [primary],
      cc: ccOnly.slice(1).filter((e) => norm(e) !== pn),
      bcc: bccOnly.filter((e) => norm(e) !== pn),
    };
  }

  if (bccOnly.length > 0) {
    if (domain) {
      const dn = norm(domain);
      return {
        to: [domain],
        cc: [],
        bcc: bccOnly.filter((e) => norm(e) !== dn),
      };
    }
    return {
      to: [bccOnly[0]],
      cc: [],
      bcc: bccOnly.slice(1),
    };
  }

  if (domain) {
    return { to: [domain], cc: [], bcc: [] };
  }

  return null;
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
    const matches = rules.filter(
      (rule) => normalizeCtaTitleKey(rule.ctaTitle) === key,
    );
    if (matches.length === 0) continue;

    // Prefer the most recently configured matching rule that has active
    // notification recipients, then active docs, otherwise fall back to last.
    for (let i = matches.length - 1; i >= 0; i -= 1) {
      const rule = matches[i];
      const hasActiveNotify = (rule.notifyEmails ?? []).some(
        (entry) =>
          (entry.enabled ?? true) &&
          typeof entry.email === "string" &&
          entry.email.includes("@"),
      );
      if (hasActiveNotify) return rule;
    }
    for (let i = matches.length - 1; i >= 0; i -= 1) {
      const rule = matches[i];
      const hasAutoDocs = (rule.documents ?? []).some(
        (doc) => !!doc.url && doc.autoSend !== false,
      );
      if (hasAutoDocs) return rule;
    }
    return matches[matches.length - 1];
  }
  return undefined;
}

function readPageCtaForwardingRules(rawSections: unknown): CtaForwardingRule[] {
  if (!Array.isArray(rawSections)) return [];
  const hero = rawSections.find(
    (section) =>
      section &&
      typeof section === "object" &&
      (section as { kind?: unknown }).kind === "hero",
  ) as { props?: unknown } | undefined;
  if (!hero || !hero.props || typeof hero.props !== "object") return [];
  const rules = (hero.props as { ctaForwardingRules?: unknown }).ctaForwardingRules;
  return Array.isArray(rules) ? (rules as CtaForwardingRule[]) : [];
}

function getActiveNotifyEmails(
  rule: CtaForwardingRule | undefined,
): Array<{ email: string; kind?: "cc" | "bcc" }> {
  if (!rule) return [];
  return (rule.notifyEmails ?? []).filter(
    (entry) => (entry.enabled ?? true) && entry.email && entry.email.includes("@"),
  );
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
  const formData = (lead.formData as Record<string, unknown>) ?? {};
  let ruleSourcePage: typeof page = page;
  const submittedStepSlug = extractStepSlugFromFormData(formData);
  if (submittedStepSlug) {
    const stepPage = await prisma.landingPage.findFirst({
      where: {
        domainId: domain.id,
        slug: submittedStepSlug,
      },
    });
    if (stepPage) {
      ruleSourcePage = stepPage;
    }
  }

  const { settings } = await getAdminUiSettings();
  const pageRules = readPageCtaForwardingRules(
    (ruleSourcePage as { sections?: unknown }).sections,
  );
  const rules =
    pageRules.length > 0
      ? pageRules
      : ((settings.ctaForwardingRules ?? []) as CtaForwardingRule[]);
  const resolvedRule = findCtaRule(rules, ruleSourcePage.ctaText, formData);
  const resolvedNotifyEmails = getActiveNotifyEmails(resolvedRule);

  // Email to agent via Resend
  if (resend && (domain.notifyEmail || resolvedNotifyEmails.length > 0)) {
    try {
      const subject = `[New ${lead.type} lead] ${domain.hostname} / ${ruleSourcePage.slug}`;
      const data = (lead.formData as Record<string, unknown>) ?? {};
      const lines = flattenLeadFormDataForEmail(data);
      const fieldRows = formLinesToFieldRows(lines);
      const brandName = (domain.displayName ?? domain.hostname).trim() || domain.hostname;

      const { html, text } = await renderNewLeadEmailHtml({
        leadType: lead.type,
        domainHostname: domain.hostname,
        pageSlug: ruleSourcePage.slug,
        brandName,
        logoUrl: domain.logoUrl ?? null,
        fieldRows,
      });

      const leadAlertRouting = buildDocumentRecipients(
        domain.notifyEmail,
        resolvedNotifyEmails,
        domain.notifyEmail,
      );
      if (!leadAlertRouting || leadAlertRouting.to.length === 0) {
        console.warn("[notifications] Lead email skipped: no recipients found", {
          leadId: lead.id,
          pageSlug: ruleSourcePage.slug,
        });
      } else {
        const leadPayload: Parameters<typeof resend.emails.send>[0] = {
          from: resolveFromAddress(domain.notifyEmail),
          to: leadAlertRouting.to,
          subject,
          html,
          text,
        };
        if (leadAlertRouting.cc.length > 0) leadPayload.cc = leadAlertRouting.cc;
        if (leadAlertRouting.bcc.length > 0) leadPayload.bcc = leadAlertRouting.bcc;
        await resend.emails.send(leadPayload);
      }
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

      const rule = resolvedRule;
      if (!rule) {
        const ctaCandidates = collectCtaCandidates(formData);
        console.warn("[notifications] Document email skipped: CTA rule not found", {
          leadId: lead.id,
          pageSlug: ruleSourcePage.slug,
          ctaText: ruleSourcePage.ctaText,
          ctaCandidates,
        });
      }
      const docs = (rule?.documents ?? []).filter(
        (d) => d.url && d.autoSend !== false,
      );
      if (docs.length === 0) {
        console.warn("[notifications] Document email skipped: no auto-send docs", {
          leadId: lead.id,
          pageSlug: ruleSourcePage.slug,
        });
      }
      if (docs.length > 0) {
        const notify = resolvedNotifyEmails;

        const routing = buildDocumentRecipients(
          leadEmail,
          notify,
          domain.notifyEmail,
        );

        if (!routing || routing.to.length === 0) {
          console.warn("[notifications] Document email skipped: no recipients found", {
            leadId: lead.id,
            pageSlug: page.slug,
          });
        } else {
          const documentNames = docs.map((d) => d.name?.trim() || "Document");

          const { html, text } = await renderDocumentDeliveryEmailHtml({
            siteName: domain.displayName?.trim() || domain.hostname,
            domainHostname: domain.hostname,
            pageSlug: ruleSourcePage.slug,
            documentNames,
            logoUrl: domain.logoUrl ?? null,
          });

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

          const payload: Parameters<typeof resend.emails.send>[0] = {
            from: resolveFromAddress(domain.notifyEmail),
            to: routing.to,
            subject: `Your requested documents from ${domain.displayName ?? domain.hostname}`,
            html,
            text,
            attachments,
          };
          if (routing.cc.length > 0) payload.cc = routing.cc;
          if (routing.bcc.length > 0) payload.bcc = routing.bcc;
          const resendTemplateId = rule?.resendTemplateId?.trim();
          if (resendTemplateId) {
            try {
              const extractedFormVariables = extractTemplateVariablesFromFormData(
                formData,
              );
              const siteName = domain.displayName?.trim() || domain.hostname;
              const pageValue = ruleSourcePage.slug;
              const websiteValue = domain.hostname;
              const docNamesArray = documentNames;
              const docNameValue = documentNames.join(", ");
              const templatePayload: Parameters<typeof resend.emails.send>[0] = {
                from: resolveFromAddress(domain.notifyEmail),
                to: routing.to,
                subject: `Your requested documents from ${domain.displayName ?? domain.hostname}`,
                ...(routing.cc.length > 0 ? { cc: routing.cc } : {}),
                ...(routing.bcc.length > 0 ? { bcc: routing.bcc } : {}),
                // keep docs delivery behavior consistent with existing flow
                attachments,
                template: {
                  id: resendTemplateId,
                  variables: {
                    ...extractedFormVariables,
                    siteName,
                    domainHostname: websiteValue,
                    pageSlug: pageValue,
                    documentNames: docNamesArray,
                    // Alias keys for web-platform templates
                    website: websiteValue,
                    page: pageValue,
                    doc_name: docNameValue,
                  },
                } as any,
              } as any;
              await resend.emails.send(templatePayload);
            } catch (templateErr) {
              const resendTemplateError =
                templateErr &&
                typeof templateErr === "object" &&
                "message" in templateErr
                  ? (templateErr as { message?: unknown }).message
                  : null;
              console.error(
                "[notifications] Resend template send failed, falling back to React Email html/text",
                {
                  leadId: lead.id,
                  templateId: resendTemplateId,
                  error: resendTemplateError ?? templateErr,
                },
              );
              await resend.emails.send(payload);
            }
          } else {
            await resend.emails.send(payload);
          }

          console.log("[notifications] Document email send summary", {
            leadId: lead.id,
            to: routing.to,
            cc: routing.cc,
            bcc: routing.bcc,
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

