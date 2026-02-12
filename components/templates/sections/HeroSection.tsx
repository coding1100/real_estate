import Image from "next/image";
import type { LandingPageContent } from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { DynamicForm } from "@/components/forms/DynamicForm";

interface HeroSectionProps {
  page: LandingPageContent;
  formSchema?: FormSchema | null;
}

export function HeroSection({ page, formSchema }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-zinc-950 text-white min-h-[800px]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:flex-row md:items-center md:py-20">
        <div className="flex-1 space-y-4 relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            {page.domain.displayName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {page.headline}
          </h1>
          {page.subheadline && (
            <p className="max-w-xl text-sm text-zinc-300 md:text-base">
              {page.subheadline}
            </p>
          )}
        </div>
        <div className="flex-1">
          <div className="rounded-2xl bg-white p-5 text-zinc-900 shadow-xl z-10 relative">
            <h2 className="mb-2 text-base font-semibold">
              {page.ctaText || "Get Started"}
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Share a few details to access your personalized results.
            </p>
            {formSchema ? (
              <DynamicForm
                schema={formSchema}
                ctaText={page.ctaText}
                successMessage={page.successMessage}
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
          </div>
        </div>
      </div>

      {page.heroImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none hidden md:flex">
          <Image
            src={page.heroImageUrl}
            alt={page.headline}
            fill
            sizes="50vw"
            className="object-cover opacity-60"
          />
        </div>
      )}
    </section>
  );
}

