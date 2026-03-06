"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import type { LandingPageContent } from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { useRecaptcha, RecaptchaScript } from "@/components/forms/Captcha";

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
}

type FormStyle =
  | "default"
  | "questionnaire"
  | "detailed-perspective"
  | "next-steps";

interface HeroLayoutConfig {
  formIntro?: string;
  leftMainHtml?: string;
  nextStepsFirstHtml?: string;
  nextStepsSecondHtml?: string;
  nextStepsSecondImageUrl?: string;
  formHeading?: string;
  formBgColor?: string;
  formTextSize?: string;
  ctaBgColor?: string;
  formStyle?: FormStyle;
  profileImageUrl?: string;
  profileSectionHtml?: string;
  profileName?: string;
  profileTitle?: string;
  profileRole?: string;
  profilePhone?: string;
  profileEmail?: string;
  formPostCtaText?: string;
  formFooterText?: string;
}

type SearchState = "idle" | "loading" | "found" | "not_found" | "error";

interface ZestimateResult {
  found: boolean;
  address: string;
  lat?: number | null;
  lng?: number | null;
  estimate?: number | null;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;

interface HomeValueMultistepFlowProps {
  mainPage: LandingPageContent;
  steps: LandingPageContent[];
  /**
   * Optional fallback layout data from the entry page.
   * When a step has its own PageLayout, that layout is used instead.
   */
  layoutData?: LayoutItem[] | null;
  utmHiddenFields?: Record<string, string | undefined>;
}

export function HomeValueMultistepFlow({
  mainPage,
  steps,
  layoutData,
  utmHiddenFields,
}: HomeValueMultistepFlowProps) {
  const hasHomeValueStep =
    Array.isArray(steps) && steps.some((s) => s.slug === mainPage.slug);

  // Start from the admin-configured steps. If /home-value itself is present
  // in the step list, we treat it as a special entry step and render the
  // dedicated Home Value UI for step 0, then use the remaining steps for
  // subsequent pages. If /home-value is NOT present in the list, we behave
  // like a normal multistep flow where the first configured slug controls
  // the first visible step.
  const baseSteps = Array.isArray(steps) ? steps : [];
  const effectiveSteps = hasHomeValueStep
    ? baseSteps.filter((s) => s.slug !== mainPage.slug)
    : baseSteps;

  const totalSteps = hasHomeValueStep
    ? 1 + effectiveSteps.length
    : effectiveSteps.length;
  if (!totalSteps) return null;

  const [currentStep, setCurrentStep] = useState(0);
  const [accumulatedData, setAccumulatedData] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const { execute } = useRecaptcha();

  // Step 0 – /home-value search + map UI state
  const [address, setAddress] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [result, setResult] = useState<ZestimateResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasFoundProperty =
    searchState === "found" && !!result && !!result.lat && !!result.lng;

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    const trimmed = address.trim();
    if (!trimmed) {
      setSearchError("Please enter a property address.");
      return;
    }
    setSearchState("loading");
    try {
      const res = await fetch("/api/home-value/zestimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed }),
      });
      if (res.status === 404) {
        setResult(null);
        setSearchState("not_found");
        setSearchError(
          "We couldn’t find this property. Please check the address and try again.",
        );
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to look up property");
      }
      const data = (await res.json()) as ZestimateResult;
      if (!data.found || !data.lat || !data.lng) {
        setResult(null);
        setSearchState("not_found");
        setSearchError(
          "We couldn’t find this property. Please check the address and try again.",
        );
        return;
      }
      setResult(data);
      setSearchState("found");
    } catch (err) {
      console.error(err);
      setResult(null);
      setSearchState("error");
      setSearchError(
        "Something went wrong while fetching your home’s details. Please try again.",
      );
    }
  }

  function getMapSrc() {
    if (!MAPS_KEY || !hasFoundProperty || !result?.lat || !result.lng) {
      return null;
    }
    const center = `${result.lat},${result.lng}`;
    const url = new URL("https://www.google.com/maps/embed/v1/view");
    url.searchParams.set("key", MAPS_KEY);
    url.searchParams.set("center", center);
    url.searchParams.set("zoom", "15");
    url.searchParams.set("maptype", "roadmap");
    return url.toString();
  }

  const mapSrc = getMapSrc();
  const isOverallLastStep = currentStep === totalSteps - 1;

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
    extraHiddenFieldsForSubmit._multistepData = JSON.stringify(
      accumulatedData,
    );
  }
  const trimmedAddress = address.trim();
  if (trimmedAddress) {
    extraHiddenFieldsForSubmit.searchedAddress = trimmedAddress;
  }
  if (result?.address) {
    extraHiddenFieldsForSubmit.resolvedAddress = result.address;
  }
  if (typeof result?.estimate === "number") {
    extraHiddenFieldsForSubmit.estimate = String(result.estimate);
  }
  if (typeof result?.lat === "number") {
    extraHiddenFieldsForSubmit.latitude = String(result.lat);
  }
  if (typeof result?.lng === "number") {
    extraHiddenFieldsForSubmit.longitude = String(result.lng);
  }
  if (utmHiddenFields) {
    if (utmHiddenFields.utm_source) {
      extraHiddenFieldsForSubmit.utm_source = utmHiddenFields.utm_source;
    }
    if (utmHiddenFields.utm_medium) {
      extraHiddenFieldsForSubmit.utm_medium = utmHiddenFields.utm_medium;
    }
    if (utmHiddenFields.utm_campaign) {
      extraHiddenFieldsForSubmit.utm_campaign = utmHiddenFields.utm_campaign;
    }
  }

  const handleFinalSubmitFromNextSteps = async () => {
    if (isSubmittingFinal) return;
    setIsSubmittingFinal(true);
    setSubmitError(null);
    try {
      const token = await execute("lead_submit");

      const body: Record<string, unknown> = {
        domain: mainPage.domain.hostname,
        slug: mainPage.slug,
        type: mainPage.type,
        website: "",
      };
      if (Object.keys(accumulatedData).length > 0) {
        body._multistepData = JSON.stringify(accumulatedData);
      }
      if (trimmedAddress) {
        body.searchedAddress = trimmedAddress;
      }
      if (result?.address) {
        body.resolvedAddress = result.address;
      }
      if (typeof result?.estimate === "number") {
        body.estimate = String(result.estimate);
      }
      if (typeof result?.lat === "number") {
        body.latitude = String(result.lat);
      }
      if (typeof result?.lng === "number") {
        body.longitude = String(result.lng);
      }
      if (token) {
        body.recaptchaToken = token;
      }
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setSubmitError("Unable to submit your request. Please try again.");
      } else {
        setIsFinalSubmitted(true);
        setSubmitError(null);
      }
    } catch {
      setSubmitError("Unable to submit your request. Please try again.");
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  // STEP 0: /home-value UI (search + map), with CTA advancing to the next step.
  // Only used when /home-value itself is explicitly included in the multistep
  // step list in admin. When it is not, we skip this and treat the first
  // configured slug as the first visible step (like other multistep pages).
  if (hasHomeValueStep && currentStep === 0) {
    const heroSections = Array.isArray(mainPage.sections)
      ? mainPage.sections
      : [];
    const heroSection = heroSections.find((s) => s.kind === "hero");
    const layout = (heroSection?.props || {}) as {
      leftMainHtml?: string;
      formHeading?: string;
      formIntro?: string;
      formFooterText?: string;
      formBgColor?: string;
      ctaBgColor?: string;
      heroLowerStripHtml?: string;
    };
    const formSchema = (mainPage.formSchema as FormSchema) ?? null;

    const hasHeroRichText = !!layout?.leftMainHtml;
    const hasFormHeading = !!layout?.formHeading;
    const hasFormIntro = !!layout?.formIntro;
    const hasFooterText = !!layout?.formFooterText;
    const lowerStripHtml = layout?.heroLowerStripHtml;
    const formBgStyle = layout?.formBgColor
      ? { backgroundColor: layout.formBgColor }
      : undefined;

    return (
      <div className="relative min-h-screen text-zinc-50 bg-[#d4c8c8]">
        <RecaptchaScript />

        {mainPage.heroImageUrl && (
          <div className="pointer-events-none inset-0 z-0 max-h-[500px]">
            <Image
              src={mainPage.heroImageUrl}
              alt={mainPage.headline}
              fill
              priority
              sizes="100vw"
              className="object-cover !max-h-[800px]"
            />
            <div className="absolute inset-0 h-[800px]" />
          </div>
        )}

        <div className="relative z-10 mx-auto  flex-col px-4 pt-[140px] pb-10 md:px-0 md:pb-12">
          <div className="mx-auto  text-center h-[660px] max-w-6xl mx-auto max-[768px]:h-auto max-[768px]:mb-[40px]">
            {hasHeroRichText ? (
              <div
                className="space-y-2 text-amber-50"
                dangerouslySetInnerHTML={{
                  __html: layout!.leftMainHtml as string,
                }}
              />
            ) : (
              <>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-amber-50 sm:text-4xl md:text-5xl">
                  {mainPage.headline}
                </h1>
                {mainPage.subheadline && (
                  <p className="mt-3 text-sm text-amber-100/90 md:text-base">
                    {mainPage.subheadline}
                  </p>
                )}
              </>
            )}

            <form
              onSubmit={handleSearch}
              className="mt-6 flex flex-col items-stretch md:flex-row md:items-center"
            >
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-amber-200/80 ">
                  <Search className="h-4 w-4 stroke-[#694636]" />
                </span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="61311 McRoberts Ln, Bend, OR 97702"
                  className="w-full rounded-xl  rounded-tl-[5px] rounded-bl-[5px]  py-2.5 pl-3 pr-9 text-md focus:outline-none focus:ring-0 h-[46px] shadow-sm placeholder:text-[#453D3D] text-[#453D3D] !bg-[#ebe4e2]"
                />
              </div>
              <button
                type="submit"
                disabled={searchState === "loading"}
                className="inline-flex !h-[46px] items-center justify-center rounded-xl bg-[#5B4534] px-6 py-2.5 text-sm font-medium text-amber-50 shadow-md shadow-amber-900/40 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {searchState === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  "Next"
                )}
              </button>
            </form>
            {searchError && (
              <p className="mt-2 text-xs text-[#453D3D]">{searchError}</p>
            )}
          </div>
          <div className="w-full bg-[#cdbfbc]">
            <div className="mx-auto h-[100px] max-w-6xl px-0 py-[36px]">
              {lowerStripHtml ? (
                <div
                  className="text-[13px] leading-snug text-[#433124]"
                  dangerouslySetInnerHTML={{ __html: lowerStripHtml }}
                />
              ) : (
                <p className="text-[13px] leading-snug text-[#433124]">
                  Licensed Oregon Broker | Bend &amp; Tetherow Luxury Specialist
                </p>
              )}
            </div>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start mt-[-340px] max-w-6xl  mx-auto max-[768px]:flex max-[768px]:flex-col-reverse">
            <div className="overflow-hidden rounded-2xl mt-[230px] max-[768px]:mt-[330px]">
              {mapSrc ? (
                <iframe
                  key={mapSrc}
                  title={result?.address || "Property map"}
                  src={mapSrc}
                  className="h-[320px] w-full md:h-[380px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : hasFooterText ? (
                <div className="flex h-[280px] w-full flex-col items-center justify-center px-3 text-center md:h-[440px]">
                  <div
                    className="max-w-lg text-sm text-amber-100/95"
                    dangerouslySetInnerHTML={{
                      __html: layout!.formFooterText as string,
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-[280px] w-full flex-col items-center justify-center gap-3  px-6 text-center md:h-[340px]">
                  <p className="font-serif text-lg font-semibold text-amber-50">
                    Private. Confidential. No automated spam.
                  </p>
                  <p className="max-w-md text-sm text-amber-100/90">
                    Enter your property address above and we’ll pinpoint it on
                    the map, then prepare a bespoke valuation report just for
                    you.
                  </p>
                </div>
              )}
            </div>

            <div className="relative">
              <div
                className="rounded-[2px] border border-amber-100/40 bg-amber-50/95 p-5 w-full"
                style={formBgStyle}
              >
                {hasFormHeading ? (
                  <div
                    className="font-serif text-lg font-semibold leading-tight text-amber-900"
                    dangerouslySetInnerHTML={{
                      __html: layout!.formHeading as string,
                    }}
                  />
                ) : (
                  <h2 className="font-serif text-lg font-semibold leading-tight text-amber-900">
                    Property Located!
                  </h2>
                )}

                {hasFormIntro && (
                  <div
                    className="mt-1 text-xs text-amber-800/80"
                    dangerouslySetInnerHTML={{
                      __html: layout!.formIntro as string,
                    }}
                  />
                )}

                <div className="mt-4">
                  {formSchema && formSchema.fields?.length ? (
                    <DynamicForm
                      schema={formSchema}
                      ctaText={mainPage.ctaText}
                      successMessage={mainPage.successMessage}
                      ctaBgColor={layout?.ctaBgColor}
                      onNextStep={handleNextStep}
                    />
                  ) : (
                    <p className="text-xs text-amber-800/80">
                      No form is configured for this page yet. Add fields in the
                      Form tab in admin.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Steps: generic multistep hero flow, reusing the existing layout patterns.
  // When hasHomeValueStep is true, currentStep 1 maps to effectiveSteps[0];
  // when false, currentStep 0 maps to effectiveSteps[0] (no special entry step).
  const innerIndex = hasHomeValueStep ? currentStep - 1 : currentStep;
  const step = effectiveSteps[innerIndex];

  const stepLayoutData =
    (step.pageLayout?.layoutData as LayoutItem[] | undefined) ||
    (layoutData as LayoutItem[] | undefined) ||
    undefined;
  const heroSection = step.sections?.find(
    (s: { kind: string }) => s.kind === "hero",
  );
  const layout = (heroSection?.props as HeroLayoutConfig) || {};
  const formSchema = (step.formSchema as FormSchema) ?? null;
  const formHeading = layout?.formHeading?.trim() ?? "";
  const formBgColor = layout?.formBgColor;
  const formTextSize = layout?.formTextSize;
  const ctaBgColor = layout?.ctaBgColor;
  const isQuestionnaire = layout?.formStyle === "questionnaire";
  const isDetailedPerspective = layout?.formStyle === "detailed-perspective";
  const isNextSteps = layout?.formStyle === "next-steps";
  const isProfileOnlyNextSteps =
    isNextSteps &&
    ((((layout as any)?.nextStepsSecondOnly as boolean | undefined) === true) ||
      step.slug === "strategy-call");

  const textLayout = stepLayoutData?.find(
    (l) => l.i === "text-container" && !l.hidden,
  );
  const formLayout = stepLayoutData?.find(
    (l) => l.i === "form-container" && !l.hidden,
  );
  const useSavedLayout = textLayout && formLayout;
  const gridWrapperClass = useSavedLayout
    ? "hero-grid-wrapper grid items-start md:grid-cols-12 md:items-center"
    : "grid items-start gap-6 md:grid-cols-12 md:gap-8 md:items-center";
  const gridWrapperStyle = useSavedLayout
    ? {
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: "1.5rem 2rem",
        alignItems: "start" as const,
      }
    : undefined;
  const textContainerStyle =
    useSavedLayout && textLayout
      ? ({
          gridColumn: `${textLayout.x + 1} / span ${textLayout.w}`,
          gridRow: `${textLayout.y + 1} / span ${textLayout.h}`,
        } as const)
      : undefined;
  const formContainerStyle =
    useSavedLayout && formLayout
      ? ({
          gridColumn: `${formLayout.x + 1} / span ${formLayout.w}`,
          gridRow: `${formLayout.y + 1} / span ${formLayout.h}`,
        } as const)
      : undefined;
  const textContainerClass = useSavedLayout
    ? "relative mt-0 space-y-4 md:-mt-4 md:space-y-6 lg:-mt-[50px] content-area"
    : "relative col-span-12 mt-0 space-y-4 md:col-span-8 md:-mt-4 md:space-y-6 lg:-mt-[50px]";
  const formContainerClass = useSavedLayout
    ? "w-full md:w-auto form-area"
    : "col-span-12 w-full md:col-span-4 md:w-auto";

  const isLastStep = isOverallLastStep;

  return (
    <section className="relative text-white min-h-[calc(100vh_-_85px)] pt-[120px] max-[768px]:pt-20">
      <RecaptchaScript />
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

      <div className="mx-auto flex h-full max-w-6xl flex-col justify-start gap-8 px-4 pt-8 pb-6 max-[768px]:px-4 md:gap-10 md:px-0 md:pt-10 md:pb-8">
        <div className={gridWrapperClass} style={gridWrapperStyle}>
          <div className={textContainerClass} style={textContainerStyle}>
            <div>
              {layout?.leftMainHtml && (
                <div
                  className="mt-4 space-y-2"
                  dangerouslySetInnerHTML={{ __html: layout.leftMainHtml }}
                />
              )}
            </div>
          </div>

          <div className={formContainerClass} style={formContainerStyle}>
            {isNextSteps ? (
              <div
                className="cust1 form-area relative w-full rounded-[2px] p-6 text-zinc-900 shadow-2xl bg-amber-50/95 opacity-95 border border-amber-200/60"
                style={formBgColor ? { backgroundColor: formBgColor } : undefined}
              >
                {formHeading && (
                  <h2
                    className="mb-5 text-xl font-semibold text-zinc-800 font-serif leading-tight text-center md:text-left"
                    dangerouslySetInnerHTML={{ __html: formHeading }}
                  />
                )}
                {isProfileOnlyNextSteps ? (
                  <div className="space-y-3">
                    <div className="relative flex items-stretch rounded-[2px] border border-[#cbb1a7ab] bg-[#fff6f1] px-4 py-4 max-[768px]:flex-wrap">
                      {(layout?.nextStepsSecondImageUrl ||
                        layout?.profileImageUrl) && (
                        <div className="relative h-[110px] w-[90px] flex-shrink-0 self-center overflow-hidden rounded-[2px] mr-[15px] max-[768px]:mb-2">
                          <Image
                            src={
                              (layout?.nextStepsSecondImageUrl ||
                                layout?.profileImageUrl) as string
                            }
                            alt={(layout?.profileName as string) || "Profile"}
                            fill
                            className="object-cover rounded-[4px]"
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col justify-center space-y-1.5 pr-4">
                        {layout?.nextStepsSecondHtml ? (
                          <div
                            className="text-sm text-zinc-800 font-serif leading-relaxed space-y-1.5"
                            dangerouslySetInnerHTML={{
                              __html: layout.nextStepsSecondHtml,
                            }}
                          />
                        ) : (
                          <>
                            {layout?.profileName && (
                              <h3 className="text-base font-semibold text-zinc-800 font-serif">
                                {layout.profileName as string}
                              </h3>
                            )}
                            {layout?.profileRole && (
                              <p className="text-sm text-zinc-700 font-serif">
                                {layout.profileRole as string}
                              </p>
                            )}
                            {layout?.profileTitle && (
                              <p className="text-sm text-zinc-600 font-serif">
                                {layout.profileTitle as string}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        disabled={isSubmittingFinal}
                        onClick={handleFinalSubmitFromNextSteps}
                        className="inline-flex w-full items-center justify-center rounded-[2px] bg-amber-800 px-4 py-2.5 text-sm font-semibold text-amber-50 shadow-md hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        style={
                          ctaBgColor ? { backgroundColor: ctaBgColor } : undefined
                        }
                      >
                        <span
                          dangerouslySetInnerHTML={{
                            __html: step.ctaText ?? mainPage.ctaText,
                          }}
                        />
                      </button>
                      {layout?.formFooterText?.trim() && (
                        <div
                          className="text-xs text-zinc-700 font-serif leading-relaxed text-center"
                          dangerouslySetInnerHTML={{
                            __html: layout.formFooterText ?? "",
                          }}
                        />
                      )}
                      {submitError && (
                        <p className="text-xs text-red-600 text-center">
                          {submitError}
                        </p>
                      )}
                      {isFinalSubmitted && (
                        <div className="text-xs text-green-700 text-center">
                          Thank you! We&apos;ll be in touch shortly.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 max-[768px]:grid-cols-1 md:grid-cols-2 md:gap-4">
                    <div className="space-y-3">
                      <div className="rounded-[2px] border border-[#cbb1a7ab] bg-[#fff6f1] px-4 py-4">
                        {(layout?.nextStepsFirstHtml || layout?.leftMainHtml) && (
                          <div
                            className="text-sm text-zinc-800 font-serif leading-relaxed space-y-2"
                            dangerouslySetInnerHTML={{
                              __html:
                                layout?.nextStepsFirstHtml ||
                                layout?.leftMainHtml ||
                                "",
                            }}
                          />
                        )}
                      </div>
                      <div className="relative flex items-stretch rounded-[2px] border border-[#cbb1a7ab] bg-[#fff6f1] px-4 py-4 max-[768px]:flex-wrap">
                        {(layout?.nextStepsSecondImageUrl ||
                          layout?.profileImageUrl) && (
                          <div className="relative h-[110px] w-[90px] flex-shrink-0 self-center overflow-hidden rounded-[2px] mr-[15px] max-[768px]:mb-2">
                            <Image
                              src={
                                (layout?.nextStepsSecondImageUrl ||
                                  layout?.profileImageUrl) as string
                              }
                              alt={(layout?.profileName as string) || "Profile"}
                              fill
                              className="object-cover rounded-[4px]"
                            />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col justify-center space-y-1.5 pr-4">
                          {layout?.nextStepsSecondHtml ? (
                            <div
                              className="text-sm text-zinc-800 font-serif leading-relaxed space-y-1.5"
                              dangerouslySetInnerHTML={{
                                __html: layout.nextStepsSecondHtml,
                              }}
                            />
                          ) : (
                            <>
                              {layout?.profileName && (
                                <h3 className="text-base font-semibold text-zinc-800 font-serif">
                                  {layout.profileName as string}
                                </h3>
                              )}
                              {layout?.profileRole && (
                                <p className="text-sm text-zinc-700 font-serif">
                                  {layout.profileRole as string}
                                </p>
                              )}
                              {layout?.profileTitle && (
                                <p className="text-sm text-zinc-600 font-serif">
                                  {layout.profileTitle as string}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex h-full flex-col justify-between rounded-[2px] border border-[#cbb1a7ab] bg-[#fff6f1] px-4 py-4">
                        <div className="space-y-2">
                          {layout?.formIntro?.trim() && (
                            <div
                              className="text-sm text-zinc-800 font-serif leading-relaxed space-y-1.5"
                              dangerouslySetInnerHTML={{
                                __html: layout.formIntro ?? "",
                              }}
                            />
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          <button
                            type="button"
                            disabled={isSubmittingFinal}
                            onClick={handleFinalSubmitFromNextSteps}
                            className="inline-flex w-full items-center justify-center rounded-[2px] bg-amber-800 px-4 py-2.5 text-sm font-semibold text-amber-50 shadow-md hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                            style={
                              ctaBgColor ? { backgroundColor: ctaBgColor } : undefined
                            }
                          >
                            <span
                              dangerouslySetInnerHTML={{
                                __html: step.ctaText ?? mainPage.ctaText,
                              }}
                            />
                          </button>
                          {layout?.formFooterText?.trim() && (
                            <div
                              className="text-xs text-zinc-700 font-serif leading-relaxed text-center"
                              dangerouslySetInnerHTML={{
                                __html: layout.formFooterText ?? "",
                              }}
                            />
                          )}
                          {submitError && (
                            <p className="text-xs text-red-600 text-center">
                              {submitError}
                            </p>
                          )}
                          {isFinalSubmitted && (
                            <div className="text-xs text-green-700 text-center">
                              Thank you! We&apos;ll be in touch shortly.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : isDetailedPerspective && formSchema ? (
              <div
                className="cust1 form-area relative w-full rounded-[2px] p-6 text-zinc-900 shadow-2xl bg-amber-50/95 opacity-95 border border-amber-200/60"
                style={formBgColor ? { backgroundColor: formBgColor } : undefined}
              >
                <div className="grid max-[768px]:grid-cols-1 md:grid-cols-[57%_40%] gap-[3%]">
                  <div className="space-y-5">
                    {formHeading && (
                      <h2
                        className="text-xl font-semibold text-zinc-800 font-serif leading-tight"
                        dangerouslySetInnerHTML={{ __html: formHeading }}
                      />
                    )}
                    {layout?.formIntro?.trim() && (
                      <p
                        className="text-sm text-zinc-700 font-serif leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: layout.formIntro }}
                      />
                    )}
                    <DynamicForm
                      schema={formSchema}
                      ctaText={step.ctaText}
                      successMessage={mainPage.successMessage}
                      textSize={formTextSize}
                      ctaBgColor={ctaBgColor}
                      formStyle="detailed-perspective"
                      helperText={
                        layout?.formIntro?.trim()
                          ? undefined
                          : "This helps us ensure the data you receive is relevant to your situation."
                      }
                      postCtaText={
                        layout?.formPostCtaText?.trim() || undefined
                      }
                      extraHiddenFields={
                        isLastStep ? extraHiddenFieldsForSubmit : undefined
                      }
                      onNextStep={isLastStep ? undefined : handleNextStep}
                      skipValidationForNextStep={false}
                    />
                  </div>
                  <div className="space-y-4 relative flex flex-col justify-center">
                    <div className="w-full px-[25px] pt-[30px] pb-[70px] break-all border border-[#cbb1a7ab] pr-[44%] flex flex-col justify-center max-[768px]:pr-4 max-[768px]:pb-4">
                      {layout?.profileImageUrl && (
                        <div className="absolute h-[265px] w-[220px] -bottom-[0px] -right-[58px] text-transparent rounded-[2px] max-[768px]:relative max-[768px]:h-40 max-[768px]:w-full max-[768px]:bottom-auto max-[768px]:right-auto max-[768px]:mx-0 max-[768px]:mb-3">
                          <Image
                            src={layout.profileImageUrl as string}
                            alt={(layout?.profileName as string) || "Profile"}
                            fill
                            className="object-cover max-[768px]:!w-auto"
                            style={{ borderRadius: "2px" }}
                          />
                        </div>
                      )}
                      {layout?.profileSectionHtml?.trim() ? (
                        <div
                          className="text-sm text-zinc-800 font-serif leading-relaxed space-y-1.5"
                          dangerouslySetInnerHTML={{
                            __html: layout.profileSectionHtml,
                          }}
                        />
                      ) : (
                        <>
                          {layout?.profileName && (
                            <h3 className="text-xl font-semibold text-zinc-800 font-serif leading-tight mb-[5px]">
                              {layout.profileName as string}
                            </h3>
                          )}
                          {layout?.profileTitle && (
                            <p className="text-sm text-zinc-700 font-serif leading-relaxed mb-[5px]">
                              {layout.profileTitle as string}
                            </p>
                          )}
                          {layout?.profileRole && (
                            <p className="text-sm text-zinc-600 font-serif leading-relaxed mb-[5px]">
                              {layout.profileRole as string}
                            </p>
                          )}
                          <div className="space-y-1.5 pt-1">
                            {layout?.profilePhone && (
                              <p className="text-sm text-zinc-700 font-serif flex items-center gap-2.5 leading-relaxed">
                                <span className="text-zinc-500 text-base">
                                  ✆
                                </span>
                                <span>{layout.profilePhone as string}</span>
                              </p>
                            )}
                            {layout?.profileEmail && (
                              <p className="text-sm text-zinc-700 font-serif flex items-center gap-2.5 leading-relaxed">
                                <span className="text-zinc-500 text-base">
                                  ✉
                                </span>
                                <span className="break-all">
                                  {layout.profileEmail as string}
                                </span>
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {layout?.formFooterText?.trim() && (
                  <div
                    className="mt-4 text-sm text-zinc-700 font-serif leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: layout.formFooterText }}
                  />
                )}
              </div>
            ) : (
              <div
                className={`cust1 relative w-full rounded-[2px] p-5 text-zinc-900 shadow-2xl md:w-full md:p-6 ${
                  isQuestionnaire
                    ? "bg-amber-50/95 opacity-95 border border-amber-200/60"
                    : "bg-white/95 opacity-90"
                }`}
                style={formBgColor ? { backgroundColor: formBgColor } : undefined}
              >
                {formHeading && (
                  <h2
                    className="mb-4 text-base font-semibold border-b border-[#eadbd3] dot font-serif"
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
                    formStyle={isQuestionnaire ? "questionnaire" : "default"}
                    extraHiddenFields={
                      isLastStep ? extraHiddenFieldsForSubmit : undefined
                    }
                    onNextStep={isLastStep ? undefined : handleNextStep}
                    skipValidationForNextStep={false}
                  />
                ) : !isLastStep ? (
                  <button
                    type="button"
                    onClick={() => handleNextStep({})}
                    className="inline-flex w-full items-center justify-center bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    style={ctaBgColor ? { backgroundColor: ctaBgColor } : undefined}
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: step.ctaText ?? mainPage.ctaText,
                      }}
                    />
                  </button>
                ) : null}

                {layout?.formIntro?.trim() && (
                  <div
                    className={`mt-4 text-md text-zinc-500 space-y-2 font-serif text-center`}
                    dangerouslySetInnerHTML={{ __html: layout.formIntro }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

