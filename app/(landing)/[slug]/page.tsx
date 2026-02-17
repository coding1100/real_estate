import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLandingPage } from "@/lib/pages";
import { BuyerTemplate } from "@/components/templates/BuyerTemplate";
import { SellerTemplate } from "@/components/templates/SellerTemplate";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
};

async function getHostnameFromHeaders() {
  const h = await headers();
  const host = h.get("host") || "";
  const hostname = host.split(":")[0] || "localhost";

  // In local dev, map localhost to a default domain so pages resolve
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "bendhomes.us";
  }

  return hostname;
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const hostname = await getHostnameFromHeaders();
  const isMasterSlug = slug === "master-seller" || slug === "master-buyer";
  const page = await getLandingPage(hostname, slug, {
    allowFallbackToAnyDomain: isMasterSlug || hostname === "bendhomes.us",
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

export default async function LandingPage({ params }: RouteParams) {
  const { slug } = await params;
  const hostname = await getHostnameFromHeaders();
  const isMasterSlug = slug === "master-seller" || slug === "master-buyer";
  const page = await getLandingPage(hostname, slug, {
    allowFallbackToAnyDomain: isMasterSlug || hostname === "bendhomes.us",
  });

  const content =
    page.type === "seller" ? (
      <SellerTemplate page={page} />
    ) : (
      <BuyerTemplate page={page} />
    );

  return (
    <>
      <GoogleAnalytics measurementId={page.domain.ga4Id} />
      <MetaPixel pixelId={page.domain.metaPixelId} />
      {content}
    </>
  );
}

