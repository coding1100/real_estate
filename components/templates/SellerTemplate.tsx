import type {
  BlockConfig,
  HeroElementsByColumn,
  LandingPageContent,
} from "@/lib/types/page";
import { HeroSection } from "./sections/HeroSection";
import Image from "next/image";
import { getDefaultBlocksForPage } from "@/lib/blocks/defaultBlocks";

interface SellerTemplateProps {
  page: LandingPageContent;
}

function BrandHeader({ page }: { page: LandingPageContent }) {
  return (
    <header className="border-b border-zinc-200 bg-white fixed top-0 right-0 left-0 z-[99]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          {page.domain.logoUrl ? (
            <Image
              src={page.domain.logoUrl}
              alt={page.domain.displayName}
              width={180}
              height={62}
              className="h-[60px] w-auto object-contain"
            />
          ) : (
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-700">
              {page.domain.displayName}
            </span>
          )}
        </div>
        <div className="flex items-center">
          {page.domain.rightLogoUrl ? (
            <Image
              src={page.domain.rightLogoUrl}
              alt="Right logo"
              width={150}
              height={24}
              className="max-h-[55px] w-auto object-contain"
            />
          ) : (
            <Image
              src="/engel-volkers-logo.svg"
              alt="Engel & Völkers"
              width={150}
              height={24}
              className="h-6 w-auto object-contain"
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
  const hasLayoutHeader = layoutData?.some((l) => l.i === "header-bar" && l.hidden !== true);
  const hasLayoutFooter = layoutData?.some((l) => l.i === "footer-bar" && l.hidden !== true);

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
      </main>
      {hasLayoutFooter && (
        <footer className="hidden fixed bottom-0 left-0 right-0 z-50 max-h-[100px] border-t border-zinc-200 bg-white overflow-hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3">
            <span className="text-xs text-zinc-600">
              {page.domain.displayName}
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}

