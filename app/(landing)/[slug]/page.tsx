import type { Metadata } from "next";
import {
  getLandingPage,
  asUnpublishedLandingPageError,
} from "@/lib/pages";
import { BuyerTemplate } from "@/components/templates/BuyerTemplate";
import { SellerTemplate } from "@/components/templates/SellerTemplate";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { getAdminUiSettings } from "@/lib/uiSettings";
import { UnpublishedPageNotice } from "@/components/landing/UnpublishedPageNotice";
import type { CtaForwardingRule } from "@/lib/types/ctaForwarding";
import {
  getRequestHostnameFromHeaders,
  isPreviewHostname,
  isPlatformHostname,
  resolveTenantHostname,
  normalizeHostname,
  shouldIncludeDraftForLandingRequest,
} from "@/lib/hostnames";

// Force dynamic rendering and no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[]>> | Record<string, string | string[]>;
};

function getQueryStringParam(
  query: Record<string, string | string[]> | undefined,
  key: string,
): string | null {
  if (!query) return null;
  const raw = query[key];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function getPreviewHostnameOverride(
  query: Record<string, string | string[]>,
): string | null {
  const raw =
    getQueryStringParam(query, "domain") ||
    getQueryStringParam(query, "hostname") ||
    getQueryStringParam(query, "host");
  if (!raw) return null;
  const normalized = normalizeHostname(raw);
  return normalized.length > 0 ? normalized : null;
}

async function getHostContextFromHeaders() {
  const rawHostname = await getRequestHostnameFromHeaders();
  return {
    rawHostname,
    hostname: resolveTenantHostname(rawHostname),
    isPreviewHost: isPreviewHostname(rawHostname),
    isPlatformHost: isPlatformHostname(rawHostname),
  };
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

export async function generateMetadata({
  params,
  searchParams,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const query = (await (searchParams as any)) ?? {};
  const { hostname, isPreviewHost, isPlatformHost, rawHostname } =
    await getHostContextFromHeaders();
  const includeDraft = shouldIncludeDraftForLandingRequest(rawHostname, query);
  const hostnameOverride =
    (isPreviewHost || isPlatformHost) && query
      ? getPreviewHostnameOverride(query)
      : null;
  const effectiveHostname = hostnameOverride || hostname;
  let page;
  try {
    page = await getLandingPage(effectiveHostname, slug, {
      allowFallbackToAnyDomain: isPreviewHost,
      includeDraft,
      includeArchived: includeDraft,
    });
  } catch (e) {
    const unpublished = asUnpublishedLandingPageError(e);
    if (unpublished) {
      return {
        title: `Coming soon | ${unpublished.siteName}`,
        robots: { index: false, follow: false },
      };
    }
    throw e;
  }

  const title = page.seo.title || page.headline;
  const description = page.seo.description || page.subheadline || undefined;
  const canonical =
    page.seo.canonicalUrl ||
    `https://${page.domain.hostname}/${page.slug}`;

  const meta: Metadata = {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: (page.seo.ogType as
        | "website"
        | "article"
        | "book"
        | "profile"
        | "music.song"
        | "music.album"
        | "music.playlist"
        | "music.radio_station"
        | "video.movie"
        | "video.episode"
        | "video.tv_show"
        | "video.other") || "website",
      siteName: page.domain.displayName,
      images: page.seo.ogImageUrl ? [page.seo.ogImageUrl] : [],
    },
    twitter: {
      card: (page.seo.twitterCard as
        | "summary_large_image"
        | "summary"
        | "player"
        | "app") || "summary_large_image",
      title,
      description,
      images: page.seo.ogImageUrl ? [page.seo.ogImageUrl] : [],
    },
    icons: {
      icon: [{ url: page.domain.faviconUrl || "/engel-volkers-logo.svg" }],
      shortcut: [{ url: page.domain.faviconUrl || "/engel-volkers-logo.svg" }],
      apple: [{ url: page.domain.faviconUrl || "/engel-volkers-logo.svg" }],
    },
    robots: page.seo.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };

  return meta;
}

export default async function LandingPage({ params, searchParams }: RouteParams) {
  const { slug } = await params;
  const query = (await (searchParams as any)) ?? {};
  const utm = {
    source: Array.isArray(query.utm_source) ? query.utm_source[0] : query.utm_source,
    medium: Array.isArray(query.utm_medium) ? query.utm_medium[0] : query.utm_medium,
    campaign: Array.isArray(query.utm_campaign)
      ? query.utm_campaign[0]
      : query.utm_campaign,
  };
  const { hostname, isPreviewHost, isPlatformHost, rawHostname } =
    await getHostContextFromHeaders();
  const hostnameOverride =
    (isPreviewHost || isPlatformHost) && query
      ? getPreviewHostnameOverride(query)
      : null;
  const effectiveHostname = hostnameOverride || hostname;
  const includeDraft = shouldIncludeDraftForLandingRequest(rawHostname, query);
  let page;
  try {
    page = await getLandingPage(effectiveHostname, slug, {
      allowFallbackToAnyDomain: isPreviewHost,
      includeDraft,
      includeArchived: includeDraft,
    });
  } catch (e) {
    const unpublished = asUnpublishedLandingPageError(e);
    if (unpublished) {
      return (
        <UnpublishedPageNotice
          siteName={unpublished.siteName}
          hostname={unpublished.hostname}
          slug={unpublished.slug}
        />
      );
    }
    throw e;
  }
  const { settings } = await getAdminUiSettings();
  const pageCtaForwardingRules = readPageCtaForwardingRules(
    (page as { sections?: unknown }).sections,
  );
  const resolvedCtaForwardingRules =
    pageCtaForwardingRules.length > 0
      ? pageCtaForwardingRules
      : (settings.ctaForwardingRules ?? []);

  const content =
    page.type === "seller" ? (
      <SellerTemplate
        page={page}
        utm={utm}
        ctaForwardingRules={resolvedCtaForwardingRules}
      />
    ) : (
      <BuyerTemplate
        page={page}
        utm={utm}
        ctaForwardingRules={resolvedCtaForwardingRules}
      />
    );

  return (
    <>
      <GoogleAnalytics measurementId={page.domain.ga4Id} />
      <MetaPixel pixelId={page.domain.metaPixelId} />
      {content}
    </>
  );
}

