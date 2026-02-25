"use client";

import { useState } from "react";
import Image from "next/image";
import type { LandingPageContent } from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { DynamicForm } from "@/components/forms/DynamicForm";

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
}

interface HeroLayoutConfig {
  formIntro?: string;
  leftMainHtml?: string;
  formHeading?: string;
  formBgColor?: string;
  formTextSize?: string;
  ctaBgColor?: string;
  formStyle?: string;
}

interface MultistepHeroFlowProps {
  mainPage: LandingPageContent;
  steps: LandingPageContent[];
  layoutData?: LayoutItem[] | null;
}

export function MultistepHeroFlow({
  mainPage,
  steps,
  layoutData,
}: MultistepHeroFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [accumulatedData, setAccumulatedData] = useState<Record<string, Record<string, unknown>>>({});

  if (!steps.length) return null;

  const step = steps[currentStep];
  const heroSection = step.sections?.find((s: { kind: string }) => s.kind === "hero");
  const layout = (heroSection?.props as HeroLayoutConfig) || {};
  const formSchema = (step.formSchema as FormSchema) ?? null;
  const formHeading = layout?.formHeading?.trim() ?? "";
  const formBgColor = layout?.formBgColor;
  const formTextSize = layout?.formTextSize;
  const ctaBgColor = layout?.ctaBgColor;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const textLayout = layoutData?.find((l) => l.i === "text-container" && !l.hidden);
  const formLayout = layoutData?.find((l) => l.i === "form-container" && !l.hidden);
  const useSavedLayout = textLayout && formLayout;
  const gridWrapperClass = useSavedLayout
    ? "grid items-start md:grid-cols-12 md:items-center"
    : "grid items-start gap-6 md:grid-cols-12 md:gap-8 md:items-center";
  const gridWrapperStyle = useSavedLayout
    ? { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem 2rem", alignItems: "start" as const }
    : undefined;
  const textContainerStyle = useSavedLayout && textLayout
    ? { gridColumn: `${textLayout.x + 1} / span ${textLayout.w}` as const, gridRow: `${textLayout.y + 1} / span ${textLayout.h}` as const }
    : undefined;
  const formContainerStyle = useSavedLayout && formLayout
    ? { gridColumn: `${formLayout.x + 1} / span ${formLayout.w}` as const, gridRow: `${formLayout.y + 1} / span ${formLayout.h}` as const }
    : undefined;
  const textContainerClass = useSavedLayout
    ? "relative mt-0 space-y-4 md:-mt-4 md:space-y-6 lg:-mt-[50px] content-area"
    : "relative col-span-12 mt-0 space-y-4 md:col-span-8 md:-mt-4 md:space-y-6 lg:-mt-[50px]";
  const formContainerClass = useSavedLayout
    ? "w-full md:w-auto form-area"
    : "col-span-12 w-full md:col-span-4 md:w-auto";

  const handleNextStep = (values: Record<string, unknown>) => {
    setAccumulatedData((prev) => ({
      ...prev,
      ["step" + currentStep]: values,
    }));
    setCurrentStep((i) => i + 1);
  };

  const extraHiddenFieldsForSubmit: Record<string, string> = {
    domain: mainPage.domain.hostname,
    slug: mainPage.slug,
    type: mainPage.type,
  };
  if (Object.keys(accumulatedData).length > 0) {
    extraHiddenFieldsForSubmit._multistepData = JSON.stringify(accumulatedData);
  }

  return (
    <section className="relative text-white min-h-[calc(100vh_-_85px)] pt-[120px]">
      {(mainPage.heroImageUrl || step.heroImageUrl) && (
        <div className="pointer-events-none inset-0 fixed top-0 left-0 right-0 bottom-0">
          <Image
            src={(step.heroImageUrl || mainPage.heroImageUrl) as string}
            alt={step.headline}
            fill
            priority
            sizes="100vw"
            className="object-cover filter brightness-65 max-h-[1000px]"
          />
        </div>
      )}

      <div className="mx-auto flex h-full max-w-6xl flex-col justify-start gap-8 px-4 pt-8 pb-6 md:gap-10 md:px-0 md:pt-10 md:pb-8">
        <div className={gridWrapperClass} style={gridWrapperStyle}>
          <div className={textContainerClass} style={textContainerStyle}>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-300">
                {mainPage.domain.displayName}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                {step.headline}
              </h1>
              {step.subheadline && (
                <p className="mt-3 text-sm md:text-base text-zinc-200">
                  {step.subheadline}
                </p>
              )}
              {layout?.leftMainHtml && (
                <div
                  className="mt-4 space-y-2"
                  dangerouslySetInnerHTML={{ __html: layout.leftMainHtml }}
                />
              )}
            </div>
          </div>

          <div className={formContainerClass} style={formContainerStyle}>
            <div
              className="cust1 relative w-full rounded-[2px] p-5 text-zinc-900 shadow-2xl md:w-full md:p-6 bg-white/95 opacity-90"
              style={formBgColor ? { backgroundColor: formBgColor } : undefined}
            >
              {formHeading && (
                <h2
                  className="mb-4 text-base font-semibold border-b border-zinc-300 dot font-serif"
                  dangerouslySetInnerHTML={{ __html: formHeading }}
                />
              )}
              {formSchema && formSchema.fields?.length > 0 ? (
                <DynamicForm
                  schema={formSchema}
                  ctaText={step.ctaText}
                  successMessage={mainPage.successMessage}
                  textSize={formTextSize}
                  ctaBgColor={ctaBgColor}
                  formStyle="default"
                  extraHiddenFields={isLastStep ? extraHiddenFieldsForSubmit : undefined}
                  onNextStep={isLastStep ? undefined : handleNextStep}
                  skipValidationForNextStep={!isLastStep && isFirstStep}
                />
              ) : !isLastStep ? (
                <button
                  type="button"
                  onClick={() => handleNextStep({})}
                  className="inline-flex w-full items-center justify-center bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  style={ctaBgColor ? { backgroundColor: ctaBgColor } : undefined}
                >
                  <span dangerouslySetInnerHTML={{ __html: step.ctaText }} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
