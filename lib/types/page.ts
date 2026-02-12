import type { FormSchema } from "./form";

export type LandingPageType = "buyer" | "seller";

export interface SectionConfig {
  id: string;
  kind:
    | "hero"
    | "description"
    | "carousel"
    | "imageSlider"
    | "testimonial"
    | "trustBar"
    | "footer";
  // Arbitrary config payload per section
  props: Record<string, unknown>;
}

export interface LandingPageContent {
  id: string;
  slug: string;
  domain: {
    hostname: string;
    displayName: string;
    logoUrl?: string | null;
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
  formSchema?: FormSchema | null;
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

