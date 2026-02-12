import type { LandingPageContent } from "@/lib/types/page";
import { HeroSection } from "./sections/HeroSection";
import { DescriptionSection } from "./sections/DescriptionSection";
import { ImageSliderSection } from "./sections/ImageSliderSection";
import { TestimonialSection } from "./sections/TestimonialSection";
import { TrustBarSection } from "./sections/TrustBarSection";
import { FooterSection } from "./sections/FooterSection";

interface SellerTemplateProps {
  page: LandingPageContent;
}

export function SellerTemplate({ page }: SellerTemplateProps) {
  const heroFormSchema = page.formSchema ?? {
    fields: [],
  };

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
    <div className="min-h-screen bg-zinc-50">
      <HeroSection page={page} formSchema={heroFormSchema as any} />
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

