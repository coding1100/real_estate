import type { LandingPageContent } from "@/lib/types/page";
import { HeroSection } from "./sections/HeroSection";
import { DescriptionSection } from "./sections/DescriptionSection";
import { ImageSliderSection } from "./sections/ImageSliderSection";
import { TestimonialSection } from "./sections/TestimonialSection";
import { TrustBarSection } from "./sections/TrustBarSection";
import { FooterSection } from "./sections/FooterSection";
import Image from "next/image";

interface SellerTemplateProps {
  page: LandingPageContent;
}

function BrandHeader({ page }: { page: LandingPageContent }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {page.domain.logoUrl ? (
            <Image
              src={page.domain.logoUrl}
              alt={page.domain.displayName}
              width={180}
              height={62}
              className="h-[60px] w-auto object-contain"
            />
          ) : (
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-700">
              {page.domain.displayName}
            </span>
          )}
        </div>
        <div className="flex items-center">
          {page.domain.rightLogoUrl ? (
            <Image
              src={page.domain.rightLogoUrl}
              alt="Right logo"
              width={150}
              height={24}
              className="max-h-[55px] w-auto object-contain"
            />
          ) : (
            <Image
              src="/engel-volkers-logo.svg"
              alt="Engel & Völkers"
              width={150}
              height={24}
              className="h-6 w-auto object-contain"
            />
          )}
        </div>
      </div>
    </header>
  );
}

export function SellerTemplate({ page }: SellerTemplateProps) {
  const heroFormSchema = page.formSchema ?? {
    fields: [],
  };

  // Hero layout config (left/right rich text, colors, etc.) comes from
  // the "hero" section props, same as for the buyer template.
  const heroSections = Array.isArray(page.sections) ? page.sections : [];
  const heroConfig =
    heroSections.find((s) => s.kind === "hero")?.props || {};

  const processConfig = page.sections.find(
    (s) => s.kind === "description",
  )?.props as any;

  const sliderConfig = page.sections.find(
    (s) => s.kind === "imageSlider",
  )?.props as any;

  const testimonialConfig = page.sections.find(
    (s) => s.kind === "testimonial",
  )?.props as any;

  const trustBarConfig = page.sections.find(
    (s) => s.kind === "trustBar",
  )?.props as any;

  return (
    <div className="min-h-screen bg-zinc-50 custom">
      <BrandHeader page={page} />
      <HeroSection
        page={page}
        formSchema={heroFormSchema as any}
        layout={heroConfig as any}
      />
      <DescriptionSection
        title={processConfig?.title}
        body={processConfig?.body}
        bullets={processConfig?.steps}
      />
      <ImageSliderSection
        title={sliderConfig?.title}
        items={sliderConfig?.items}
      />
      <TestimonialSection
        quote={testimonialConfig?.quote}
        name={testimonialConfig?.name}
        label={testimonialConfig?.label}
      />
      <TrustBarSection
        title={trustBarConfig?.title}
        items={trustBarConfig?.items}
      />
      <FooterSection complianceText={page.domain?.hostname} />
    </div>
  );
}

