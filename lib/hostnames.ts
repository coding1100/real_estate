import { headers } from "next/headers";
import type { NextRequest } from "next/server";

const DEFAULT_DEV_FALLBACK_HOSTNAME = "bendhomes.us";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function splitAndNormalizeHosts(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => normalizeHostname(entry))
    .filter(Boolean);
}

function firstSegment(raw: string): string {
  return raw.split(",")[0]?.trim() ?? raw.trim();
}

export function normalizeHostname(raw: string): string {
  if (!raw) return "";
  let value = firstSegment(raw.trim().toLowerCase());
  value = value.replace(/^https?:\/\//, "");
  value = value.split("/")[0] ?? value;
  value = value.split("?")[0] ?? value;
  value = value.split("#")[0] ?? value;

  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end > 0) {
      value = value.slice(1, end);
    }
  } else {
    value = value.split(":")[0] ?? value;
  }

  return value.replace(/\.+$/, "").trim();
}

export function isLikelyPublicHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  const domainRegex =
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i;
  return domainRegex.test(normalized);
}

export function getPlatformHostnames(): Set<string> {
  const hosts = new Set<string>();
  splitAndNormalizeHosts(process.env.PLATFORM_HOSTS).forEach((host) =>
    hosts.add(host),
  );

  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    try {
      hosts.add(normalizeHostname(new URL(nextAuthUrl).hostname));
    } catch {
      // ignore malformed URL
    }
  }

  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return hosts;
}

export function isPlatformHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  return getPlatformHostnames().has(normalized);
}

export function isPreviewHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;

  const previewHosts = new Set<string>(["localhost", "127.0.0.1"]);
  splitAndNormalizeHosts(process.env.PREVIEW_HOSTS).forEach((host) =>
    previewHosts.add(host),
  );

  if (previewHosts.has(normalized)) return true;

  const allowVercelPreview = parseBoolean(
    process.env.ALLOW_VERCEL_PREVIEW_HOSTS,
    true,
  );
  if (allowVercelPreview && normalized.endsWith(".vercel.app")) {
    return true;
  }

  return false;
}

export function resolveTenantHostname(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  if (normalized !== "localhost" && normalized !== "127.0.0.1") {
    return normalized;
  }

  const devFallback = normalizeHostname(
    process.env.DEV_FALLBACK_HOSTNAME ?? DEFAULT_DEV_FALLBACK_HOSTNAME,
  );
  return devFallback || normalized;
}

export async function getRequestHostnameFromHeaders(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost || h.get("host") || "";
  return normalizeHostname(host);
}

export function getRequestHostnameFromNextRequest(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "";
  return normalizeHostname(host);
}

