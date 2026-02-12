import type { LandingPageContent } from "@/lib/types/page";
import { HeroSection } from "./sections/HeroSection";
import { DescriptionSection } from "./sections/DescriptionSection";
import { CarouselSection } from "./sections/CarouselSection";
import { TestimonialSection } from "./sections/TestimonialSection";
import { TrustBarSection } from "./sections/TrustBarSection";
import { FooterSection } from "./sections/FooterSection";

interface BuyerTemplateProps {
  page: LandingPageContent;
}

export function BuyerTemplate({ page }: BuyerTemplateProps) {
  const heroFormSchema = page.formSchema ?? {
    fields: [],
  };

  const descriptionConfig = page.sections.find(
    (s) => s.kind === "description",
  )?.props as any;

  const carouselConfig = page.sections.find(
    (s) => s.kind === "carousel",
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
        title={descriptionConfig?.title}
        body={descriptionConfig?.body}
        bullets={descriptionConfig?.bullets}
      />
      <CarouselSection
        title={carouselConfig?.title}
        items={carouselConfig?.items}
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

