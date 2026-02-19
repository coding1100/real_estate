import Image from "next/image";
import type {
  HeroElementsByColumn,
  HeroElementKind,
  LandingPageContent,
} from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { DynamicForm } from "@/components/forms/DynamicForm";

type FormStyle = "default" | "questionnaire";

interface HeroLayoutConfig {
  formIntro?: string;
  leftMainHtml?: string;
  formHeading?: string;
  formBgColor?: string;
  formTextSize?: string;
  ctaBgColor?: string;
  formStyle?: FormStyle;
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

  const useHeroElements =
    heroElements &&
    (heroElements.left.length > 0 || heroElements.right.length > 0);

  const textLayout = layoutData?.find((l) => l.i === "text-container" && !l.hidden);
  const formLayout = layoutData?.find((l) => l.i === "form-container" && !l.hidden);
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
    ? "relative mt-0 space-y-4 md:-mt-4 md:space-y-6 lg:-mt-[50px]"
    : "relative col-span-12 mt-0 space-y-4 md:col-span-8 md:-mt-4 md:space-y-6 lg:-mt-[50px]";
  const formContainerClass = useSavedLayout
    ? "w-full md:w-auto"
    : "col-span-12 w-full md:col-span-4 md:w-auto";

  return (
    <section className="relative text-white min-h-[calc(100vh_-_85px)]  pt-[120px]">
      {page.heroImageUrl && (
        <div className="pointer-events-none inset-0 absolute">
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

      <div className="mx-auto flex h-full max-w-6xl flex-col justify-center gap-8 px-4 pt-8 pb-6 md:gap-10 md:px-0 md:pt-10 md:pb-8">
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

          {(useHeroElements || visibleBlocks?.showForm !== false) &&
            formSchema &&
            (formSchema.fields?.length ?? 0) > 0 && (
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
          )}
        </div>
      </div>
    </section>
  );
}

