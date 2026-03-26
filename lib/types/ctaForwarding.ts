export interface CtaForwardingRule {
  ctaTitle: string;
  forwardUrl: string;
}

export function sanitizeCtaTitle(value: string): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCtaTitleKey(value: string): string {
  return sanitizeCtaTitle(value).toLowerCase();
}

