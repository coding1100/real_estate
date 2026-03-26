import Image from "next/image";
import type {
  HeroElementsByColumn,
  HeroElementKind,
  LandingPageContent,
} from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import type { CtaForwardingRule } from "@/lib/types/ctaForwarding";
import { normalizeCtaTitleKey } from "@/lib/types/ctaForwarding";
import { wrapLegalSignsHtml } from "@/lib/richTextSigns";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { SocialLinksBar } from "@/components/templates/SocialLinksBar";

type FormStyle =
  | "default"
  | "questionnaire"
  | "detailed-perspective"
  | "next-steps"
  | "team-showcase";

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

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
}

interface HeroSectionProps {
  page: LandingPageContent;
  formSchema?: FormSchema | null;
  layout?: HeroLayoutConfig;
  layoutData?: LayoutItem[] | null;
  heroElements?: HeroElementsByColumn;
  visibleBlocks?: {
    showHeadline: boolean;
    showSubheadline: boolean;
    showLeft: boolean;
    showForm: boolean;
  };
  utmHiddenFields?: Record<string, string | undefined>;
  ctaForwardingRules?: CtaForwardingRule[];
}

export function HeroSection({
  page,
  formSchema,
  layout,
  layoutData,
  heroElements,
  visibleBlocks,
  utmHiddenFields,
  ctaForwardingRules,
}: HeroSectionProps) {
  const formHeading = layout?.formHeading?.trim() ?? "";
  const formBgColor = layout?.formBgColor;
  const formTextSize = layout?.formTextSize;
  const ctaBgColor = layout?.ctaBgColor;
  const isQuestionnaire = layout?.formStyle === "questionnaire";
  const isDetailedPerspective = layout?.formStyle === "detailed-perspective";
  const isNextSteps = layout?.formStyle === "next-steps";
  const isTeamShowcase = layout?.formStyle === "team-showcase";
  const isProfileOnlyNextSteps =
    isNextSteps &&
    ((((layout as any)?.nextStepsSecondOnly as boolean | undefined) === true) ||
      page.slug === "strategy-call");

  // Hero left: main card behavior
  // - If a non-empty rich text block is authored, render it.
  // - If the editor has been explicitly saved as empty string, suppress all
  //   fallback hero copy (headline/subheadline) and show nothing.
  // - If the field is undefined (never touched), use the normal defaults.
  const leftMainRaw = (layout as any)?.leftMainHtml as string | undefined;
  const hasExplicitBlankHero = leftMainRaw === "";
  const leftMainHtml =
    typeof leftMainRaw === "string" && leftMainRaw.trim().length > 0
      ? leftMainRaw
      : null;

  const useHeroElements =
    heroElements &&
    (heroElements.left.length > 0 || heroElements.right.length > 0);

  const textLayout = layoutData?.find(
    (l) => l.i === "text-container" && !l.hidden,
  );
  const formLayout = layoutData?.find(
    (l) => l.i === "form-container" && !l.hidden,
  );
  const useSavedLayout = textLayout && formLayout;

  const gridWrapperClass = useSavedLayout
    ? "hero-grid-wrapper grid items-start md:grid-cols-12 md:items-center"
    : "grid items-start gap-6 md:grid-cols-12 md:gap-8 md:items-center";
  const gridWrapperStyle = useSavedLayout
    ? { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "1.5rem 2rem", alignItems: "start" as const }
    : undefined;
  const textContainerStyle = useSavedLayout
    ? {
      gridColumn: `${textLayout.x + 1} / span ${textLayout.w}`,
      gridRow: `${textLayout.y + 1} / span ${textLayout.h}`,
    }
    : undefined;
  const formContainerStyle = useSavedLayout
    ? {
      gridColumn: `${formLayout.x + 1} / span ${formLayout.w}`,
      gridRow: `${formLayout.y + 1} / span ${formLayout.h}`,
    }
    : undefined;
  const textContainerClass = useSavedLayout
    ? "relative mt-0 space-y-4 md:-mt-4 md:space-y-6 lg:-mt-[50px] content-area"
    : "relative col-span-12 mt-0 space-y-4 md:col-span-8 md:-mt-4 md:space-y-6 lg:-mt-[50px]";
  const formContainerClass = useSavedLayout
    ? "w-full md:w-auto form-area"
    : "col-span-12 w-full md:col-span-4 md:w-auto";

  const teamImageUrl = (layout as any)?.teamImageUrl as string | undefined;
  const teamInfoHtml = (layout as any)?.teamInfoHtml as string | undefined;
  const teamTrustHtml = (layout as any)?.teamTrustHtml as string | undefined;
  const normalizedPageCtaKey = normalizeCtaTitleKey(page.ctaText ?? "");
  const teamFallbackForwardUrl = (ctaForwardingRules ?? []).find((rule) => {
    const normalizedRule = normalizeCtaTitleKey(rule.ctaTitle);
    return normalizedRule.length > 0 && normalizedRule === normalizedPageCtaKey;
  })?.forwardUrl;

  if (isTeamShowcase) {
    return (
      <section className="relative text-white min-h-[calc(100vh_-_85px)] pt-[120px] max-[768px]:pt-20">
        {page.heroImageUrl && (
          <div className="pointer-events-none inset-0 fixed top-0 left-0 right-0 bottom-0">
            <Image
              src={page.heroImageUrl}
              alt={page.headline}
              fill
              priority
              quality={60}
              sizes="100vw"
              className="object-cover brightness-[0.58]"
            />
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 pb-10 md:px-0 md:pb-12 relative z-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] items-end">
            <div className="team-member space-y-4 rounded-[2px] md:p-6">
              <div
                className="rounded-[2px] bg-amber-50/95 p-4 text-zinc-900 md:p-5"
                style={formBgColor ? { backgroundColor: formBgColor } : undefined}
              >
                {formHeading ? (
                  <div
                    className="mb-3 font-serif text-lg font-semibold leading-tight text-amber-900"
                    dangerouslySetInnerHTML={{
                      __html: wrapLegalSignsHtml(formHeading),
                    }}
                  />
                ) : null}
                {formSchema && formSchema.fields?.length ? (
                  <DynamicForm
                    schema={formSchema}
                    ctaText={page.ctaText}
                    successMessage={page.successMessage}
                    ctaForwardingRules={ctaForwardingRules}
                    ctaBgColor={ctaBgColor}
                    textSize={formTextSize}
                    extraHiddenFields={{
                      domain: page.domain.hostname,
                      slug: page.slug,
                      type: page.type,
                      ...(utmHiddenFields ?? {}),
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    {teamFallbackForwardUrl ? (
                      <a
                        href={teamFallbackForwardUrl}
                        className="inline-flex w-full items-center justify-center bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
                        style={ctaBgColor ? { backgroundColor: ctaBgColor } : undefined}
                      >
                        <span
                          className="cta-text"
                          dangerouslySetInnerHTML={{
                            __html: wrapLegalSignsHtml(page.ctaText),
                          }}
                        />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex w-full items-center justify-center bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm opacity-70"
                        style={ctaBgColor ? { backgroundColor: ctaBgColor } : undefined}
                      >
                        <span
                          className="cta-text"
                          dangerouslySetInnerHTML={{
                            __html: wrapLegalSignsHtml(page.ctaText),
                          }}
                        />
                      </button>
                    )}
                    {!teamFallbackForwardUrl && (
                      <p className="text-xs text-amber-900/80">
                        Configure a CTA forwarding rule in Settings to make this
                        CTA redirect.
                      </p>
                    )}
                     
                  </div>
                )}
                {teamTrustHtml ? (
                  <div
                    className="mt-3 text-xs text-zinc-700"
                    dangerouslySetInnerHTML={{
                      __html: wrapLegalSignsHtml(teamTrustHtml),
                    }}
                  />
                ) : null}
               <div className="mt-3">
                      <SocialLinksBar base={page.domain} overrides={page.socialOverrides ?? null} />
                    </div>
              </div>
            </div>

            <div className="relative min-h-[260px] md:min-h-[420px] team-img self-end md:sticky md:bottom-0">
              {teamImageUrl ? (
                <Image
                  src={teamImageUrl}
                  alt="Team"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-contain object-bottom"
                />
              ) : (
                <div className="h-full w-full rounded-[2px] border border-white/20 bg-black/25" />
              )}
              {teamInfoHtml ? (
                <div
                  className="absolute bottom-2 right-2 max-w-[100%] bottom-[10%] right-[10%] rounded-[2px] px-3 py-2 text-right text-xs text-white md:text-sm"
                  dangerouslySetInnerHTML={{
                    __html: wrapLegalSignsHtml(teamInfoHtml),
                  }}
                />
              ) : null}
            </div>
          </div>

        </div>
      </section>
    );
  }

  return (
    <section className="relative text-white min-h-[calc(100vh_-_85px)] pt-[120px] max-[768px]:pt-20">
      {page.heroImageUrl && (
        <div className="pointer-events-none inset-0 fixed top-0 left-0 right-0 bottom-0">
          <Image
            src={page.heroImageUrl}
            alt={page.headline}
            fill
            priority
            quality={55}
            sizes="100vw"
            className="object-cover filter brightness-65 max-h-[1000px]"
          />
        </div>
      )}

      <div className="mx-auto flex h-full max-w-6xl flex-col justify-start gap-8 px-4 pt-8 pb-6 max-[768px]:px-4 md:gap-10 md:px-0 md:pt-10 md:pb-8">
        <div className={gridWrapperClass} style={gridWrapperStyle}>
          {(useHeroElements || visibleBlocks?.showLeft !== false) && (
            <div className={textContainerClass} style={textContainerStyle}>
              <div>
                {/* When authored, the rich text hero card should always
                   take precedence over default headline/subheadline or
                   hero element wiring. */}
                {leftMainHtml ? (
                  <div
                    className="space-y-2"
                    // authored by admin via rich text editor
                    dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(leftMainHtml) }}
                  />
                ) : hasExplicitBlankHero ? null : (
                  <>
                    <p className="mb-2 text-[14px] font-semibold uppercase tracking-[0.26em] text-zinc-300">
                      {page.domain.displayName}
                    </p>
                    {useHeroElements ? (
                      <div className="space-y-2">
                        {heroElements?.left
                          .filter((el) => !el.hidden)
                          .map((el) => {
                            if (el.kind === "heroHeadline") {
                              return (
                                <h1
                                  key={el.id}
                                  className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl"
                                >
                                  {page.headline}
                                </h1>
                              );
                            }
                            if (
                              el.kind === "heroSubheadline" &&
                              page.subheadline
                            ) {
                              return (
                                <p
                                  key={el.id}
                                  className="mt-3 text-sm md:text-base text-zinc-200"
                                >
                                  {page.subheadline}
                                </p>
                              );
                            }
                            if (el.kind === "heroLeftRichText" && layout) {
                              return (
                                <div
                                  key={el.id}
                                  className="space-y-2"
                                  dangerouslySetInnerHTML={{
                                    __html: wrapLegalSignsHtml(layout.leftMainHtml ?? ""),
                                  }}
                                />
                              );
                            }
                            return null;
                          })}
                      </div>
                    ) : (
                      <>
                        {visibleBlocks?.showHeadline !== false && (
                          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                            {page.headline}
                          </h1>
                        )}
                        {visibleBlocks?.showSubheadline !== false &&
                          page.subheadline && (
                            <p className="mt-3 text-sm md:text-base text-zinc-200">
                              {page.subheadline}
                            </p>
                          )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {(useHeroElements || visibleBlocks?.showForm !== false) && (
            isNextSteps ? (
              <div className={formContainerClass} style={formContainerStyle}>
                <div
                  className="cust1 form-area relative w-full rounded-[2px] p-6 text-zinc-900 shadow-2xl bg-amber-50/95 opacity-95 border border-amber-200/60"
                  style={formBgColor ? { backgroundColor: formBgColor } : undefined}
                >
                  {formHeading && (
                    <div
                      className="mb-5 text-xl font-semibold text-zinc-800 font-serif leading-tight text-center md:text-left"
                      dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(formHeading) }}
                    />
                  )}

                  {isProfileOnlyNextSteps ? (
                    // Strategy call variant: show only the second block + CTA, full width
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
                                __html: wrapLegalSignsHtml(layout.nextStepsSecondHtml),
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

                      {!!page.ctaText && (
                        <div className="mt-2">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center rounded-[2px] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-colors"
                            style={
                              ctaBgColor
                                ? { backgroundColor: ctaBgColor }
                                : { backgroundColor: "#a5883b" }
                            }
                          >
                            <span
                              dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(page.ctaText) }}
                            />
                          </button>
                        </div>
                      )}
                      <SocialLinksBar
                        base={page.domain}
                        overrides={page.socialOverrides ?? null}
                        className="mt-2"
                      />
                    </div>
                  ) : (
                    // Default Next steps layout: three sections across two columns
                    <div className="grid gap-4 max-[768px]:grid-cols-1 md:grid-cols-2 md:gap-4">
                      <div className="space-y-3">
                        <div className=" rounded-[2px] border border-[#cbb1a7ab] bg-[#fff6f1] px-4 py-4">
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
                                  __html: wrapLegalSignsHtml(layout.nextStepsSecondHtml),
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
                                  __html: wrapLegalSignsHtml(layout.formIntro ?? ""),
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div className="mt-3">
                              <button
                                type="button"
                                className="inline-flex w-full items-center justify-center rounded-[2px] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-colors"
                                style={
                                  ctaBgColor
                                    ? { backgroundColor: ctaBgColor }
                                    : { backgroundColor: "#a5883b" }
                                }
                              >
                                <span
                                  dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(page.ctaText) }}
                                />
                              </button>
                            </div>
                            <SocialLinksBar
                              base={page.domain}
                              overrides={page.socialOverrides ?? null}
                              className="mt-3"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : formSchema && (formSchema.fields?.length ?? 0) > 0 ? (
              isDetailedPerspective ? (
                <div className={formContainerClass} style={formContainerStyle}>
                  <div
                    className="cust1 form-area relative w-full rounded-[2px] p-6 text-zinc-900 shadow-2xl bg-amber-50/95 opacity-95 border border-amber-200/60"
                    style={formBgColor ? { backgroundColor: formBgColor } : undefined}
                  >
                    <div className="grid max-[768px]:grid-cols-1 md:grid-cols-[57%_40%] gap-[3%]">
                      <div className="space-y-5">
                        {formHeading && (
                          <div
                            className="text-xl font-semibold text-zinc-800 font-serif leading-tight"
                            dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(formHeading) }}
                          />
                        )}
                        {layout?.formIntro?.trim() && (
                          <p
                            className="text-sm text-zinc-700 font-serif leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(layout.formIntro) }}
                          />
                        )}
                        <DynamicForm
                          schema={formSchema}
                          ctaText={page.ctaText}
                          successMessage={page.successMessage}
                          ctaForwardingRules={ctaForwardingRules}
                          textSize={formTextSize}
                          ctaBgColor={ctaBgColor}
                          formStyle="detailed-perspective"
                          helperText={
                            layout?.formIntro?.trim()
                              ? undefined
                              : "This helps us ensure the data you receive is relevant to your situation."
                          }
                          postCtaText={layout?.formPostCtaText?.trim() || undefined}
                          extraHiddenFields={{
                            domain: page.domain.hostname,
                            slug: page.slug,
                            type: page.type,
                            ...(utmHiddenFields ?? {}),
                          }}
                        />
                        <SocialLinksBar
                          base={page.domain}
                          overrides={page.socialOverrides ?? null}
                          className="mt-3"
                        />
                      </div>
                      <div className="space-y-4 relative flex flex-col justify-center">
                        <div className="w-full px-[25px] pt-[30px] pb-[70px] break-all relative border border-[#cbb1a7ab] pr-[44%] flex flex-col justify-center max-[768px]:pr-4 max-[768px]:pb-4">
                          {layout?.profileImageUrl && (
                            <div className="absolute h-[300px] w-[220px] -bottom-[0px] -right-[54px] text-transparent rounded-[2px] max-[768px]:relative max-[768px]:h-40 max-[768px]:w-full max-[768px]:bottom-auto max-[768px]:right-auto max-[768px]:mx-0 max-[768px]:mb-3">
                              <Image
                                src={layout.profileImageUrl as string}
                                alt={(layout?.profileName as string) || "Profile"}
                                fill
                                className=" max-[768px]:!w-auto"
                                style={{ borderRadius: "2px" }}
                              />
                            </div>
                          )}
                          {layout?.profileSectionHtml?.trim() ? (
                            <div
                              className="text-sm text-zinc-800 font-serif leading-relaxed space-y-1.5"
                              dangerouslySetInnerHTML={{
                                __html: wrapLegalSignsHtml(layout.profileSectionHtml),
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
                                    <span className="text-zinc-500 text-base">✆</span>
                                    <span>{layout.profilePhone as string}</span>
                                  </p>
                                )}
                                {layout?.profileEmail && (
                                  <p className="text-sm text-zinc-700 font-serif flex items-center gap-2.5 leading-relaxed">
                                    <span className="text-zinc-500 text-base">✉</span>
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
                  </div>
                  {/* <SocialLinksBar
                    base={page.domain}
                    overrides={page.socialOverrides ?? null}
                    className="mt-3"
                  /> */}
                  {layout?.formFooterText?.trim() && (
                    <div
                      className="mt-4 text-sm text-zinc-700 font-serif leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(layout.formFooterText) }}
                    />
                  )}
                </div>
              ) : (
                <div className={formContainerClass} style={formContainerStyle}>
                  <div
                    className={`cust1 relative w-full rounded-[2px] p-5 text-zinc-900 shadow-2xl md:w-full md:p-6 ${isQuestionnaire
                        ? "bg-amber-50/95 opacity-95 border border-amber-200/60"
                        : "bg-white/95 opacity-90"
                      }`}
                    style={formBgColor ? { backgroundColor: formBgColor } : undefined}
                  >
                    {formHeading && (
                      <div
                        className={`mb-4 text-base font-semibold border-b border-[#eadbd3] dot font-serif ${isQuestionnaire ? "text-zinc-800 text-center" : ""
                          }`}
                        dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(formHeading) }}
                      />
                    )}

                    <DynamicForm
                      schema={formSchema}
                      ctaText={page.ctaText}
                      successMessage={page.successMessage}
                      ctaForwardingRules={ctaForwardingRules}
                      textSize={formTextSize}
                      ctaBgColor={ctaBgColor}
                      formStyle={isQuestionnaire ? "questionnaire" : "default"}
                      extraHiddenFields={{
                        domain: page.domain.hostname,
                        slug: page.slug,
                        type: page.type,
                        ...(utmHiddenFields ?? {}),
                      }}
                    />
                    <SocialLinksBar
                      base={page.domain}
                      overrides={page.socialOverrides ?? null}
                    />
                    {layout?.formIntro?.trim() && (
                      <div
                        className={`mt-4 text-md text-zinc-500 space-y-2 font-serif ${isQuestionnaire ? "text-center text-zinc-600" : "text-center"
                          }`}
                        dangerouslySetInnerHTML={{
                          __html: wrapLegalSignsHtml(layout.formIntro),
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            ) : null)}
        </div>
      </div>
    </section>
  );
}

