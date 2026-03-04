import type {
  BlockConfig,
  HeroElementsByColumn,
  LandingPageContent,
} from "@/lib/types/page";
import { HeroSection } from "./sections/HeroSection";
import { MultistepHeroFlow } from "./MultistepHeroFlow";
import Image from "next/image";
import { getDefaultBlocksForPage } from "@/lib/blocks/defaultBlocks";
import { HomeValueExperience } from "./sections/HomeValueExperience";
import { HomeValueMultistepFlow } from "./HomeValueMultistepFlow";

interface SellerTemplateProps {
  page: LandingPageContent;
}

function BrandHeader({ page }: { page: LandingPageContent }) {
  return (
    <header className="border-b border-zinc-200 bg-white fixed top-0 right-0 left-0 z-[99]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-3 max-[768px]:px-3 max-[768px]:py-2 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          {page.domain.logoUrl ? (
            <Image
              src={page.domain.logoUrl}
              alt={page.domain.displayName}
              width={180}
              height={62}
              className="h-[60px] w-auto object-contain max-[768px]:max-h-10 max-[768px]:max-w-[120px]"
            />
          ) : (
            <span className="text-md font-medium uppercase tracking-[0.2em] text-zinc-700 max-[768px]:text-sm truncate">
              {page.domain.displayName}
            </span>
          )}
        </div>
        <div className="flex items-center shrink-0">
          {page.domain.rightLogoUrl ? (
            <Image
              src={page.domain.rightLogoUrl}
              alt="Right logo"
              width={150}
              height={24}
              className="max-h-[55px] w-auto object-contain max-[768px]:max-h-8 max-[768px]:max-w-[100px]"
            />
          ) : (
            <Image
              src="/engel-volkers-logo.svg"
              alt="Engel & Völkers"
              width={150}
              height={24}
              className="h-6 w-auto object-contain max-[768px]:max-h-5 max-[768px]:max-w-[90px]"
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

  const heroSections = Array.isArray(page.sections) ? page.sections : [];
  const heroSection = heroSections.find((s) => s.kind === "hero");
  const heroConfig = (heroSection?.props as Record<string, unknown>) || {};
  const heroElements = heroConfig.heroElements as
    | HeroElementsByColumn
    | undefined;

  const blocks: BlockConfig[] =
    page.blocks && page.blocks.length > 0
      ? page.blocks
      : getDefaultBlocksForPage(page);

  const hasBlock = (kind: BlockConfig["kind"]) =>
    blocks.some((b) => b.kind === kind && b.hidden !== true);

  const layoutData = page.pageLayout?.layoutData as
    | { i: string; hidden?: boolean }[]
    | undefined;
  const hasLayoutHeader = layoutData?.some(
    (l) => l.i === "header-bar" && l.hidden !== true,
  );
  const hasLayoutFooter = layoutData?.some(
    (l) => l.i === "footer-bar" && l.hidden !== true,
  );

  // Any page that uses the home-value specific hero fields (lower strip / map footer),
  // except the dedicated /home-value-qualify step, should get the specialized layout.
  const isHomeValuePage =
    page.slug !== "home-value-qualify" &&
    (!!(heroConfig as any).heroLowerStripHtml ||
      !!(heroConfig as any).formFooterText);

  return (
    <div className="min-h-screen bg-zinc-50 custom">
      {hasLayoutHeader ? (
        <div className="fixed top-0 left-0 right-0 z-50 max-h-[100px] border-b border-zinc-200 bg-white overflow-hidden">
          <BrandHeader page={page} />
        </div>
      ) : (
        <BrandHeader page={page} />
      )}
      <main
        className={
          hasLayoutHeader && hasLayoutFooter
            ? ""
            : hasLayoutHeader
              ? "pt-[100px]"
              : hasLayoutFooter
                ? "pb-[100px]"
                : undefined
        }
      >
        {isHomeValuePage && page.multistepSteps && page.multistepSteps.length > 0 ? (
          <HomeValueMultistepFlow
            mainPage={page}
            steps={page.multistepSteps}
            layoutData={layoutData as any}
          />
        ) : isHomeValuePage ? (
          <HomeValueExperience
            page={page}
            layout={heroConfig as any}
            formSchema={heroFormSchema as any}
          />
        ) : page.multistepSteps && page.multistepSteps.length > 0 ? (
          <MultistepHeroFlow
            mainPage={page}
            steps={page.multistepSteps}
            layoutData={layoutData as any}
          />
        ) : (
          <HeroSection
            page={page}
            formSchema={heroFormSchema as any}
            layout={heroConfig as any}
            layoutData={layoutData as any}
            heroElements={heroElements}
            visibleBlocks={{
              showHeadline: hasBlock("heroHeadline"),
              showSubheadline: hasBlock("heroSubheadline"),
              showLeft: hasBlock("heroLeftRichText"),
              showForm: hasBlock("heroForm"),
            }}
          />
        )}
      </main>
      {page.footerHtml && page.footerHtml.trim().length > 0 && (
        <footer className="mt-10 border-t border-zinc-200 bg-[#f7f3f0] relative z-50">
          <div className="mx-auto max-w-6xl px-3 py-3 md:px-3">
            <div
              className="prose prose-sm max-w-none text-zinc-700"
              dangerouslySetInnerHTML={{ __html: page.footerHtml as string }}
            />
          </div>
        </footer>
      )}
      {hasLayoutFooter && (
        <footer className="hidden fixed bottom-0 left-0 right-0 z-50 max-h-[100px] border-t border-zinc-200 bg-white overflow-hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3 max-[768px]:px-3 max-[768px]:py-2">
            <span className="text-md text-zinc-600 max-[768px]:text-sm truncate">
              {page.domain.displayName}
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}

