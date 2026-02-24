import Image from "next/image";
import type {
  HeroElementsByColumn,
  HeroElementKind,
  LandingPageContent,
} from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { DynamicForm } from "@/components/forms/DynamicForm";

type FormStyle = "default" | "questionnaire" | "detailed-perspective" | "next-steps";

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
}

export function HeroSection({
  page,
  formSchema,
  layout,
  layoutData,
  heroElements,
  visibleBlocks,
}: HeroSectionProps) {
  const formHeading = layout?.formHeading?.trim() ?? "";
  const formBgColor = layout?.formBgColor;
  const formTextSize = layout?.formTextSize;
  const ctaBgColor = layout?.ctaBgColor;
  const isQuestionnaire = layout?.formStyle === "questionnaire";
  const isDetailedPerspective = layout?.formStyle === "detailed-perspective";
  const isNextSteps = layout?.formStyle === "next-steps";

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
    ? "grid items-start md:grid-cols-12 md:items-center"
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

  return (
    <section className="relative text-white min-h-[calc(100vh_-_85px)]  pt-[120px]">
      {page.heroImageUrl && (
        <div className="pointer-events-none inset-0 fixed top-0 left-0 right-0 bottom-0">
          <Image
            src={page.heroImageUrl}
            alt={page.headline}
            fill
            priority
            sizes="100vw"
            className="object-cover filter brightness-65 max-h-[1000px]"
          />
        </div>
      )}

      <div className="mx-auto flex h-full max-w-6xl flex-col justify-start gap-8 px-4 pt-8 pb-6 md:gap-10 md:px-0 md:pt-10 md:pb-8">
        <div className={gridWrapperClass} style={gridWrapperStyle}>
          {(useHeroElements || visibleBlocks?.showLeft !== false) && (
            <div className={textContainerClass} style={textContainerStyle}>
              <div>
                {layout?.leftMainHtml && !useHeroElements ? (
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
                                    __html: layout.leftMainHtml ?? "",
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
                    <h2
                      className="mb-5 text-xl font-semibold text-zinc-800 font-serif leading-tight text-center md:text-left"
                      dangerouslySetInnerHTML={{ __html: formHeading }}
                    />
                  )}
                  <div className="grid gap-4 md:grid-cols-2 md:gap-4">
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
                      <div className="relative flex items-stretch rounded-[2px] border border-[#cbb1a7ab] bg-[#fff6f1] px-4 py-4">
                      {(layout?.nextStepsSecondImageUrl ||
                          layout?.profileImageUrl) && (
                          <div className="relative h-[110px] w-[90px] flex-shrink-0 self-center overflow-hidden rounded-[2px] mr-[15px]">
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
                        <div className="mt-3">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center rounded-[2px] bg-[#a5883b] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#8c7533] transition-colors"
                          >
                            <span
                              dangerouslySetInnerHTML={{ __html: page.ctaText }}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : formSchema && (formSchema.fields?.length ?? 0) > 0 ? (
              isDetailedPerspective ? (
                <div className={formContainerClass} style={formContainerStyle}>
                  <div
                    className="cust1 form-area relative w-full rounded-[2px] p-6 text-zinc-900 shadow-2xl bg-amber-50/95 opacity-95 border border-amber-200/60"
                    style={formBgColor ? { backgroundColor: formBgColor } : undefined}
                  >
                    <div className="grid md:grid-cols-[57%_40%] gap-[3%]">
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
                          ctaText={page.ctaText}
                          successMessage={page.successMessage}
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
                          }}
                        />
                      </div>
                      <div className="space-y-4 relative flex flex-col justify-center">
                        <div className="w-full px-[25px] pt-[30px] pb-[70px] border border-[#cbb1a7ab] pr-[44%] flex flex-col justify-center">
                          {layout?.profileImageUrl && (
                            <div className="absolute h-[265px] w-[220px] -bottom-[0px] -right-[58px] text-transparent rounded-[2px]">
                              <Image
                                src={layout.profileImageUrl as string}
                                alt={(layout?.profileName as string) || "Profile"}
                                fill
                                className="object-cover"
                                style={{ borderRadius: "2px" }}
                              />
                            </div>
                          )}
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
                        </div>
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
                <div className={formContainerClass} style={formContainerStyle}>
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
                        className={`mb-4 text-base font-semibold border-b border-zinc-300 dot font-serif ${
                          isQuestionnaire ? "text-zinc-800 text-center" : ""
                        }`}
                        dangerouslySetInnerHTML={{ __html: formHeading }}
                      />
                    )}

                    <DynamicForm
                      schema={formSchema}
                      ctaText={page.ctaText}
                      successMessage={page.successMessage}
                      textSize={formTextSize}
                      ctaBgColor={ctaBgColor}
                      formStyle={isQuestionnaire ? "questionnaire" : "default"}
                      extraHiddenFields={{
                        domain: page.domain.hostname,
                        slug: page.slug,
                        type: page.type,
                      }}
                    />
                    {layout?.formIntro?.trim() && (
                      <div
                        className={`mt-4 text-xs text-zinc-500 space-y-2 font-serif ${
                          isQuestionnaire ? "text-center text-zinc-600" : "text-center"
                        }`}
                        dangerouslySetInnerHTML={{
                          __html: layout.formIntro,
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

