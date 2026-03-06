import type { Metadata } from "next";
import { getLandingPage } from "@/lib/pages";
import { BuyerTemplate } from "@/components/templates/BuyerTemplate";
import { SellerTemplate } from "@/components/templates/SellerTemplate";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import {
  getRequestHostnameFromHeaders,
  isPreviewHostname,
  resolveTenantHostname,
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

async function getHostContextFromHeaders() {
  const rawHostname = await getRequestHostnameFromHeaders();
  return {
    hostname: resolveTenantHostname(rawHostname),
    isPreviewHost: isPreviewHostname(rawHostname),
  };
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const { hostname, isPreviewHost } = await getHostContextFromHeaders();
  const page = await getLandingPage(hostname, slug, {
    allowFallbackToAnyDomain: isPreviewHost,
  });

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
  const { hostname, isPreviewHost } = await getHostContextFromHeaders();
  console.log("[landing-page] Fetching page:", slug, "hostname:", hostname);
  const page = await getLandingPage(hostname, slug, {
    allowFallbackToAnyDomain: isPreviewHost,
  });
  console.log("[landing-page] Got page:", page.slug, "headline:", page.headline);

  const content =
    page.type === "seller" ? (
      <SellerTemplate page={page} utm={utm} />
    ) : (
      <BuyerTemplate page={page} utm={utm} />
    );

  return (
    <>
      <GoogleAnalytics measurementId={page.domain.ga4Id} />
      <MetaPixel pixelId={page.domain.metaPixelId} />
      {content}
    </>
  );
}

