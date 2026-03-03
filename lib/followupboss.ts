import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

const FUB_API_BASE_URL = "https://api.followupboss.com";
const FUB_EVENTS_PATH = "/v1/events";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 750;
const MAX_BACKOFF_MS = 10_000;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const SKIPPED_FORM_KEYS = new Set(["recaptchatoken", "website", "multistepdata"]);
const CONTACT_FIELD_KEYS = new Set([
  "name",
  "fullname",
  "firstname",
  "lastname",
  "email",
  "emailaddress",
  "mail",
  "phone",
  "phonenumber",
  "mobile",
  "cell",
  "tel",
]);

type LeadRecord = Prisma.LeadGetPayload<{
  include: {
    domain: true;
    page: true;
  };
}>;

type FlattenedField = {
  key: string;
  path: string[];
  normalizedKey: string;
  value: string;
};

type FollowUpBossConfig = {
  enabled: boolean;
  apiKey: string;
  system: string;
  systemKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxAttempts: number;
  initialBackoffMs: number;
  includeRawJson: boolean;
};

type FollowUpBossCampaign = {
  source: string;
  medium?: string;
  name?: string;
};

type FollowUpBossPerson = {
  firstName?: string;
  lastName?: string;
  emails?: Array<{ value: string }>;
  phones?: Array<{ value: string }>;
};

type FollowUpBossEventPayload = {
  source: string;
  sourceUrl: string;
  system: string;
  type: "General Inquiry" | "Seller Inquiry";
  message: string;
  person: FollowUpBossPerson;
  campaign?: FollowUpBossCampaign;
};

let missingConfigWarned = false;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function trimSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function getConfig(): FollowUpBossConfig {
  return {
    enabled: parseBoolean(process.env.FUB_ENABLED, true),
    apiKey: (process.env.FUB_API_KEY ?? "").trim(),
    system: (process.env.FUB_SYSTEM ?? "").trim(),
    systemKey: (process.env.FUB_SYSTEM_KEY ?? "").trim(),
    baseUrl: trimSlashes(
      (process.env.FUB_API_BASE_URL ?? FUB_API_BASE_URL).trim() || FUB_API_BASE_URL,
    ),
    timeoutMs: parsePositiveInt(process.env.FUB_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxAttempts: Math.max(
      1,
      parsePositiveInt(process.env.FUB_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS),
    ),
    initialBackoffMs: parsePositiveInt(
      process.env.FUB_INITIAL_BACKOFF_MS,
      DEFAULT_INITIAL_BACKOFF_MS,
    ),
    includeRawJson: parseBoolean(process.env.FUB_INCLUDE_RAW_JSON, false),
  };
}

function normalizeSourceDomain(hostname: string): string {
  const trimmed = hostname.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? withoutProtocol;
  const withoutPort = withoutPath.split(":")[0] ?? withoutPath;
  return withoutPort.replace(/^www\./, "");
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function flattenFormData(value: unknown, path: string[] = []): FlattenedField[] {
  if (value == null) return [];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const asText = String(value).trim();
    if (!asText) return [];
    const key = path.join(".");
    const normalizedKey = normalizeKey(path[path.length - 1] ?? key);
    if (SKIPPED_FORM_KEYS.has(normalizedKey)) return [];
    return [{ key, path, normalizedKey, value: asText }];
  }

  if (Array.isArray(value)) {
    const fields: FlattenedField[] = [];
    value.forEach((entry, idx) => {
      fields.push(...flattenFormData(entry, [...path, String(idx)]));
    });
    return fields;
  }

  if (typeof value === "object") {
    const fields: FlattenedField[] = [];
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      fields.push(...flattenFormData(v, [...path, k]));
    });
    return fields;
  }

  return [];
}

function findFieldByKeys(fields: FlattenedField[], keys: string[]): string | null {
  const normalizedSet = new Set(keys.map((k) => normalizeKey(k)));
  const direct = fields.find((f) => normalizedSet.has(f.normalizedKey));
  if (direct) return direct.value;

  const suffix = fields.find((f) => {
    for (const k of normalizedSet) {
      if (f.normalizedKey.endsWith(k)) return true;
    }
    return false;
  });
  return suffix?.value ?? null;
}

function findEmail(fields: FlattenedField[]): string | null {
  const byKey = findFieldByKeys(fields, ["email", "emailAddress", "mail"]);
  if (byKey && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(byKey)) return byKey;

  const byPattern = fields.find((f) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
  return byPattern?.value ?? null;
}

function sanitizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return hasPlus ? `+${digits}` : digits;
}

function findPhone(fields: FlattenedField[]): string | null {
  const byKey = findFieldByKeys(fields, ["phone", "phoneNumber", "mobile", "cell", "tel"]);
  if (byKey) {
    const parsed = sanitizePhone(byKey);
    if (parsed) return parsed;
  }

  const byPattern = fields.find((f) => /\+?\d[\d\s().-]{6,}/.test(f.value));
  if (!byPattern) return null;
  return sanitizePhone(byPattern.value);
}

function splitFullName(fullName: string): { firstName?: string; lastName?: string } {
  const normalized = fullName.replace(/\s+/g, " ").trim();
  if (!normalized) return {};
  const parts = normalized.split(" ");
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function looksLikePersonName(value: string): boolean {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (normalized.length > 80) return false;
  if (/@/.test(normalized)) return false;
  if (/\d/.test(normalized)) return false;
  if (!/[A-Za-z]/.test(normalized)) return false;

  const words = normalized.split(" ");
  if (words.length === 0 || words.length > 4) return false;
  return true;
}

function findNameCandidate(fields: FlattenedField[]): string | null {
  const byLikelyKey = findFieldByKeys(fields, [
    "name",
    "fullName",
    "fullname",
    "firstName",
    "firstname",
  ]);
  if (byLikelyKey && looksLikePersonName(byLikelyKey)) {
    return byLikelyKey;
  }

  const fallback = fields.find((f) => looksLikePersonName(f.value));
  return fallback?.value ?? null;
}

function extractPerson(formData: unknown): FollowUpBossPerson | null {
  const fields = flattenFormData(formData);
  const firstName = findFieldByKeys(fields, [
    "firstName",
    "firstname",
    "first_name",
    "fname",
  ]);
  const lastName = findFieldByKeys(fields, ["lastName", "lastname", "last_name", "lname"]);
  const fullName = findFieldByKeys(fields, ["name", "fullName", "fullname"]);
  const email = findEmail(fields);
  const phone = findPhone(fields);
  const fallbackName = findNameCandidate(fields);

  const fromFullName =
    !firstName && !lastName
      ? splitFullName(fullName ?? fallbackName ?? "")
      : {};

  const person: FollowUpBossPerson = {
    ...(firstName || fromFullName.firstName
      ? { firstName: (firstName ?? fromFullName.firstName)?.trim() }
      : {}),
    ...(lastName || fromFullName.lastName
      ? { lastName: (lastName ?? fromFullName.lastName)?.trim() }
      : {}),
    ...(email ? { emails: [{ value: email }] } : {}),
    ...(phone ? { phones: [{ value: phone }] } : {}),
  };

  if (!person.firstName && !person.lastName && !person.emails?.length && !person.phones?.length) {
    return null;
  }

  return person;
}

function serializeFormData(value: unknown): string {
  if (value == null) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function stripHtml(value: string): string {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function humanizeSegment(segment: string): string {
  if (/^\d+$/.test(segment)) {
    return `Item ${Number.parseInt(segment, 10) + 1}`;
  }
  const spaced = segment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return toTitleCase(spaced);
}

function parseStepIndex(segment: string): number | null {
  const match = /^step(\d+)$/i.exec(segment);
  if (!match) return null;
  const idx = Number.parseInt(match[1], 10);
  return Number.isFinite(idx) ? idx : null;
}

function normalizeComparable(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getPersonName(person: FollowUpBossPerson): string | null {
  const full = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return full || null;
}

function shouldSkipAsContactField(
  field: FlattenedField,
  person: FollowUpBossPerson,
): boolean {
  if (CONTACT_FIELD_KEYS.has(field.normalizedKey)) {
    return true;
  }

  const normalized = normalizeComparable(field.value);
  if (!normalized) return true;

  if (person.emails?.some((email) => normalizeComparable(email.value) === normalized)) {
    return true;
  }

  const fieldPhone = sanitizePhone(field.value);
  if (
    fieldPhone &&
    person.phones?.some((phone) => sanitizePhone(phone.value) === fieldPhone)
  ) {
    return true;
  }

  const personName = getPersonName(person);
  if (personName && normalizeComparable(personName) === normalized) {
    return true;
  }

  return false;
}

function formatAnswerGroups(
  formData: unknown,
  person: FollowUpBossPerson,
  fieldLabels?: Record<string, string>,
): string[] {
  const fields = flattenFormData(formData).filter(
    (field) => !shouldSkipAsContactField(field, person),
  );
  if (fields.length === 0) return [];

  const groups = new Map<
    string,
    {
      sort: number;
      items: Array<{ label: string; value: string }>;
    }
  >();
  const seen = new Set<string>();

  for (const field of fields) {
    const first = field.path[0] ?? "";
    const stepIndex = parseStepIndex(first);
    const groupLabel = stepIndex == null ? "Details" : `Step ${stepIndex + 1}`;
    const groupSort = stepIndex == null ? Number.MAX_SAFE_INTEGER : stepIndex;
    const pathWithoutStep = stepIndex == null ? field.path : field.path.slice(1);
    const labelPath = pathWithoutStep.length > 0 ? pathWithoutStep : field.path;
    const label = labelPath
      .map((segment, index) => {
        // Prefer human-authored field labels (from form schemas) for the
        // first non-step segment in the path, falling back to a humanized
        // version of the underlying key (e.g. "ownPropertyTetherow").
        if (index === 0 && fieldLabels && fieldLabels[segment]) {
          return fieldLabels[segment];
        }
        return humanizeSegment(segment);
      })
      .join(" > ");
    const dedupeKey = `${groupSort}|${normalizeKey(label)}|${normalizeComparable(field.value)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const group = groups.get(groupLabel) ?? { sort: groupSort, items: [] };
    group.items.push({ label, value: field.value });
    groups.set(groupLabel, group);
  }

  if (groups.size === 0) return [];

  const lines: string[] = [];
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    if (a[1].sort !== b[1].sort) return a[1].sort - b[1].sort;
    return a[0].localeCompare(b[0]);
  });

  for (const [groupName, group] of sortedGroups) {
    if (sortedGroups.length > 1 || groupName !== "Details") {
      lines.push(`${groupName}:`);
    }
    for (const item of group.items) {
      lines.push(`- ${item.label}: ${item.value}`);
    }
  }

  return lines;
}

function formatContactSummary(person: FollowUpBossPerson): string[] {
  const lines: string[] = [];
  const personName = getPersonName(person);
  if (personName) lines.push(`- Name: ${personName}`);

  const email = person.emails?.[0]?.value;
  if (email) lines.push(`- Email: ${email}`);

  const phone = person.phones?.[0]?.value;
  if (phone) lines.push(`- Phone: ${phone}`);

  return lines;
}

function buildMessage(
  lead: NonNullable<LeadRecord>,
  person: FollowUpBossPerson,
  config: FollowUpBossConfig,
  fieldLabels: Record<string, string>,
): string {
  const eventType = getEventType(lead.page.type);
  const lines: string[] = [
    `New ${eventType}`,
    "",
    `Lead ID: ${lead.id}`,
    `Captured At (UTC): ${lead.createdAt.toISOString()}`,
    `Source: ${normalizeSourceDomain(lead.domain.hostname)}`,
    `Page: ${lead.page.slug}`,
  ];

  if (lead.utmSource || lead.utmMedium || lead.utmCampaign) {
    lines.push(
      `UTM Source: ${lead.utmSource ?? "-"}`,
      `UTM Medium: ${lead.utmMedium ?? "-"}`,
      `UTM Campaign: ${lead.utmCampaign ?? "-"}`,
    );
  }

  const contactLines = formatContactSummary(person);
  if (contactLines.length > 0) {
    lines.push("", "Contact:", ...contactLines);
  }

  const answerLines = formatAnswerGroups(lead.formData, person, fieldLabels);
  if (answerLines.length > 0) {
    lines.push("", "Answers:", ...answerLines);
  }

  if (config.includeRawJson) {
    lines.push("", "Raw Form Data (JSON):", serializeFormData(lead.formData));
  }

  return lines.join("\n");
}

function getEventType(pageType: string): "General Inquiry" | "Seller Inquiry" {
  return pageType === "seller" ? "Seller Inquiry" : "General Inquiry";
}

function getSourceUrl(lead: NonNullable<LeadRecord>): string {
  if (lead.page.canonicalUrl) {
    return lead.page.canonicalUrl;
  }
  const normalizedHost = normalizeSourceDomain(lead.domain.hostname);
  return `https://${normalizedHost}/${lead.page.slug}`;
}

function buildCampaign(
  lead: NonNullable<LeadRecord>,
  sourceDomain: string,
): FollowUpBossCampaign | undefined {
  if (!lead.utmSource && !lead.utmMedium && !lead.utmCampaign) {
    return undefined;
  }

  const campaign: FollowUpBossCampaign = {
    source: normalizeSourceDomain(lead.utmSource ?? sourceDomain),
  };
  if (lead.utmMedium) campaign.medium = lead.utmMedium;
  if (lead.utmCampaign) campaign.name = lead.utmCampaign;
  return campaign;
}

function buildPayload(
  lead: NonNullable<LeadRecord>,
  config: FollowUpBossConfig,
  fieldLabels: Record<string, string>,
): FollowUpBossEventPayload | null {
  const source = normalizeSourceDomain(lead.domain.hostname);
  const person = extractPerson(lead.formData);
  const campaign = buildCampaign(lead, source);

  if (!person) {
    console.warn(
      `[followupboss] Skipping lead ${lead.id}: no identifiable person fields (name/email/phone).`,
    );
    return null;
  }

  return {
    source,
    sourceUrl: getSourceUrl(lead),
    system: config.system,
    type: getEventType(lead.page.type),
    message: buildMessage(lead, person, config, fieldLabels),
    person,
    ...(campaign ? { campaign } : {}),
  };
}

function getRetryDelayMs(
  attempt: number,
  response: Response | null,
  initialBackoffMs: number,
): number {
  if (response?.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number.parseInt(retryAfter, 10);
      if (Number.isFinite(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
  }

  const exponential = initialBackoffMs * 2 ** (attempt - 1);
  return Math.min(exponential, MAX_BACKOFF_MS);
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("aborted")
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function toAuthorizationHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

async function buildFieldLabelsForLead(
  lead: NonNullable<LeadRecord>,
): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};

  function addFromSchema(raw: unknown) {
    if (!raw) return;
    let schema: any = raw;
    if (typeof raw === "string") {
      try {
        schema = JSON.parse(raw);
      } catch {
        return;
      }
    }
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    for (const f of fields) {
      const id = typeof f.id === "string" ? f.id : null;
      const labelHtml = typeof f.label === "string" ? f.label : "";
      if (!id || !labelHtml) continue;
      if (!labels[id]) {
        labels[id] = stripHtml(labelHtml);
      }
    }
  }

  addFromSchema((lead.page as any).formSchema);

  const stepSlugs = (lead.page as any).multistepStepSlugs as string[] | null;
  if (Array.isArray(stepSlugs) && stepSlugs.length > 0) {
    const stepPages = await prisma.landingPage.findMany({
      where: {
        slug: { in: stepSlugs as any },
        domainId: lead.domainId,
        status: "published",
      },
      select: { formSchema: true },
    });
    for (const sp of stepPages) {
      addFromSchema(sp.formSchema as any);
    }
  }

  return labels;
}

function getErrorMessage(body: string): string {
  if (!body) return "No response body";
  try {
    const parsed = JSON.parse(body) as { errorMessage?: string; message?: string };
    return parsed.errorMessage || parsed.message || body;
  } catch {
    return body;
  }
}

export async function dispatchLeadToFollowUpBoss(leadId: string): Promise<void> {
  const config = getConfig();

  if (!config.enabled) {
    return;
  }

  if (!config.apiKey || !config.system || !config.systemKey) {
    if (!missingConfigWarned) {
      console.warn(
        "[followupboss] Integration is enabled but missing FUB_API_KEY, FUB_SYSTEM, or FUB_SYSTEM_KEY. Skipping dispatch.",
      );
      missingConfigWarned = true;
    }
    return;
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      domain: true,
      page: true,
    },
  });

  if (!lead) {
    console.warn(`[followupboss] Lead not found: ${leadId}`);
    return;
  }

  const fieldLabels = await buildFieldLabelsForLead(lead);
  const payload = buildPayload(lead, config, fieldLabels);
  if (!payload) return;

  const endpoint = `${config.baseUrl}${FUB_EVENTS_PATH}`;
  const headers = {
    Authorization: toAuthorizationHeader(config.apiKey),
    "Content-Type": "application/json",
    "X-System": config.system,
    "X-System-Key": config.systemKey,
  };

  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    let response: Response | null = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await response.text();

      if (response.status === 200 || response.status === 201) {
        console.log(
          `[followupboss] Lead ${lead.id} synced (status=${response.status}, attempt=${attempt}).`,
        );
        return;
      }

      if (response.status === 204) {
        console.warn(
          `[followupboss] Lead ${lead.id} ignored by lead flow (status=204). Check source lead flow in FUB.`,
        );
        return;
      }

      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        console.error(
          `[followupboss] Lead ${lead.id} failed (status=${response.status}): ${getErrorMessage(body)}`,
        );
        return;
      }

      if (attempt >= config.maxAttempts) {
        console.error(
          `[followupboss] Lead ${lead.id} failed after ${attempt} attempt(s) (status=${response.status}): ${getErrorMessage(body)}`,
        );
        return;
      }

      const delayMs = getRetryDelayMs(attempt, response, config.initialBackoffMs);
      console.warn(
        `[followupboss] Retryable response for lead ${lead.id} (status=${response.status}). Retrying in ${delayMs}ms.`,
      );
      await sleep(delayMs);
    } catch (error) {
      if (!isRetryableError(error) || attempt >= config.maxAttempts) {
        console.error(
          `[followupboss] Lead ${lead.id} dispatch error (attempt=${attempt}):`,
          error,
        );
        return;
      }

      const delayMs = getRetryDelayMs(attempt, response, config.initialBackoffMs);
      console.warn(
        `[followupboss] Transient error for lead ${lead.id}. Retrying in ${delayMs}ms.`,
      );
      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }
}
