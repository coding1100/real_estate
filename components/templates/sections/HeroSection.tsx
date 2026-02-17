import Image from "next/image";
import type { LandingPageContent } from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { DynamicForm } from "@/components/forms/DynamicForm";

interface HeroLayoutConfig {
  formIntro?: string;
  leftMainHtml?: string;
  formHeading?: string;
  formBgColor?: string;
  formTextSize?: string;
  ctaBgColor?: string;
}

interface HeroSectionProps {
  page: LandingPageContent;
  formSchema?: FormSchema | null;
  layout?: HeroLayoutConfig;
}

export function HeroSection({ page, formSchema, layout }: HeroSectionProps) {
  const overlayColor = page.domain.primaryColor || "#020617"; // fallback to zinc-950
  const formHeading = layout?.formHeading || "Request the Market Brief";
  const formBgColor = layout?.formBgColor;
  const formTextSize = layout?.formTextSize;
  const ctaBgColor = layout?.ctaBgColor;

  return (
    <section className="relative text-white h-[calc(100vh_-_85px)]">
      {/* Background image */}
      {page.heroImageUrl && (
        <div className="pointer-events-none inset-0 absolute">
          <Image
            src={page.heroImageUrl}
            alt={page.headline}
            fill
            priority
            sizes="100vw"
            className="object-cover filter brightness-65" 
          />
          {/* Color overlay for readability */}
          
        </div>
      )}

      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:gap-10 h-full justify-center pt-[40px] px-0 pb-[20px]">
        {/* Main hero content: text + form */}
        <div className="grid gap-8 md:grid-cols-12 items-center">
          {/* Text overlay container */}
          <div className="relative space-y-4 md:space-y-6 flex col-span-8 -mt-4 md:-mt-8 lg:-mt-[50px]">
            <div className="">
              {layout?.leftMainHtml ? (
                <div
                  className="space-y-2"
                  // authored by admin via rich text editor
                  dangerouslySetInnerHTML={{ __html: layout.leftMainHtml }}
                />
              ) : (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-300">
                    {page.domain.displayName}
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
                    {page.headline}
                  </h1>
                  {page.subheadline && (
                    <p className="mt-3 text-sm md:text-base text-zinc-200">
                      {page.subheadline}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Form container */}
          <div className="col-span-4">
            <div
              className="relative bg-white/95 p-5 text-zinc-900 shadow-2xl md:p-6 opacity-90 rounded-[2px] cust1"
              style={formBgColor ? { backgroundColor: formBgColor } : undefined}
            >
              <h2
                className="mb-4 text-base font-semibold border-b border-zinc-300 dot"
                // Form heading authored via rich text editor
                dangerouslySetInnerHTML={{ __html: formHeading }}
              />
              
              {formSchema ? (
                <DynamicForm
                  schema={formSchema}
                  ctaText={page.ctaText}
                  successMessage={page.successMessage}
                  textSize={formTextSize}
                  ctaBgColor={ctaBgColor}
                  extraHiddenFields={{
                    domain: page.domain.hostname,
                    slug: page.slug,
                    type: page.type,
                  }}
                />
              ) : (
                <p className="text-xs text-zinc-500">
                  Form configuration not available yet.
                </p>
              )}
              <div
                className="mt-4 text-xs text-zinc-500 space-y-2"
                // formIntro is authored by trusted admin via WYSIWYG
                dangerouslySetInnerHTML={{
                  __html:
                    layout?.formIntro ||
                    "Share a few details to receive your private update.",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

