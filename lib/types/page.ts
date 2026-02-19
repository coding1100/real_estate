import type { FormSchema } from "./form";

export type LandingPageType = "buyer" | "seller";

export interface SectionConfig {
  id: string;
  kind: "hero";
  props: Record<string, unknown>;
}

export type BlockKind =
  | "header"
  | "heroLayout"
  | "heroHeadline"
  | "heroSubheadline"
  | "heroLeftRichText"
  | "heroForm"
  | "heroTrustRow"
  | "heroBadgeStrip";

export type HeroElementKind =
  | "heroHeadline"
  | "heroSubheadline"
  | "heroLeftRichText"
  | "heroForm"
  | "heroTrustRow"
  | "heroBadgeStrip";

export interface HeroElementConfig {
  id: string;
  kind: HeroElementKind;
  column: "left" | "right";
  hidden?: boolean;
}

export interface HeroElementsByColumn {
  left: HeroElementConfig[];
  right: HeroElementConfig[];
}

export interface BlockConfig {
  id: string;
  kind: BlockKind;
  props: Record<string, unknown>;
  hidden?: boolean;
}

export interface LandingPageContent {
  id: string;
  slug: string;
  domain: {
    hostname: string;
    displayName: string;
    logoUrl?: string | null;
    rightLogoUrl?: string | null;
    primaryColor: string;
    accentColor: string;
    ga4Id?: string | null;
    metaPixelId?: string | null;
  };
  type: LandingPageType;
  headline: string;
  subheadline?: string | null;
  heroImageUrl?: string | null;
  ctaText: string;
  successMessage: string;
  sections: SectionConfig[];
  blocks?: BlockConfig[];
  formSchema?: FormSchema | null;
  pageLayout?: any | null;
  seo: {
    title?: string | null;
    description?: string | null;
    keywords?: string[] | null;
    ogImageUrl?: string | null;
    ogType?: string | null;
    twitterCard?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean | null;
    schemaMarkup?: Record<string, unknown> | null;
    customHeadTags?: { name: string; content: string }[] | null;
  };
}

