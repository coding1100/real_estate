"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, Loader2 } from "lucide-react";
import type { LandingPageContent } from "@/lib/types/page";
import type { CSSProperties } from "react";
import { wrapLegalSignsHtml } from "@/lib/richTextSigns";

type NavLink = {
  label?: string;
  href?: string;
  megaMenuColumns?: MegaColumn[];
};
type MegaColumn = { title?: string; links?: NavLink[] };
type HomepageButton = NonNullable<LandingPageContent["defaultHomepageButtons"]>[number];

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function resolveNavHref(rawHref: string | undefined): string {
  const href = String(rawHref ?? "").trim();
  if (!href) return "#";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/")) return href;
  if (/^www\./i.test(href) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(href)) {
    return `https://${href}`;
  }
  return href;
}

function applyBlockqoute2ToLastTextElement(html: string): string {
  if (!html || typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    Array.from(doc.body.querySelectorAll(".blockqoute2")).forEach((el) =>
      el.classList.remove("blockqoute2"),
    );
    const selector = [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "li",
      "strong",
    ].join(",");
    const all = Array.from(doc.body.querySelectorAll(selector)) as HTMLElement[];
    const candidates = all.filter((el) => {
      if ((el.textContent || "").trim().length === 0) return false;
      // Avoid styling nested inline elements when a parent text block exists.
      const parent = el.parentElement;
      return !parent || !parent.closest("p,h1,h2,h3,h4,h5,h6,blockquote,li,strong");
    });
    const last = candidates[candidates.length - 1];
    if (!last) return html;
    last.classList.add("blockqoute2");
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

export function FixedDefaultHomepage({ page }: { page: LandingPageContent }) {
  const deriveSlugFromHref = (href: string | null | undefined): string => {
    const normalized = String(href ?? "").trim();
    if (!normalized.startsWith("/")) return "";
    const path = normalized.split("?")[0]?.split("#")[0] ?? "";
    return path.replace(/^\/+/, "").trim();
  };
  const PREVIEW_CANVAS_W = 1280;
  const PREVIEW_CANVAS_H = 1100;
  const PREVIEW_BOX_W = 560;
  const PREVIEW_BOX_H = 482;
  const PREVIEW_SCALE = Math.min(
    PREVIEW_BOX_W / PREVIEW_CANVAS_W,
    PREVIEW_BOX_H / PREVIEW_CANVAS_H,
  );
  const PREVIEW_SCALED_W = PREVIEW_CANVAS_W * PREVIEW_SCALE;
  const PREVIEW_SCALED_H = PREVIEW_CANVAS_H * PREVIEW_SCALE;
  const PREVIEW_OFFSET_X = (PREVIEW_BOX_W - PREVIEW_SCALED_W) / 2;
  const PREVIEW_OFFSET_Y = (PREVIEW_BOX_H - PREVIEW_SCALED_H) / 2;

  const hero = (page.sections.find((section) => section.kind === "hero")?.props ??
    {}) as Record<string, unknown>;
  const rawNavLinks = safeArray<NavLink>(hero.homeNavLinks);
  const fallbackMegaColumns = safeArray<MegaColumn>(hero.homeMegaMenuColumns);
  const navLinks = useMemo(() => {
    if (rawNavLinks.length === 0) return rawNavLinks;
    return rawNavLinks.map((link, idx) => ({
      ...link,
      megaMenuColumns:
        Array.isArray(link.megaMenuColumns) && link.megaMenuColumns.length > 0
          ? link.megaMenuColumns
          : idx === 0 && fallbackMegaColumns.length > 0
            ? fallbackMegaColumns
            : [],
    }));
  }, [rawNavLinks, fallbackMegaColumns]);
  const leftTopHtml = String(hero.leftMainHtml ?? hero.homeLeftTopHtml ?? "");
  const backgroundImageUrl = String(
    hero.homeBackgroundImageUrl ?? page.heroImageUrl ?? "",
  );
  const masterBackgroundImageUrl = String(hero.masterBackgroundImageUrl ?? "");
  const brightnessRaw = Number(hero.heroImageBrightness);
  const brightness = Number.isFinite(brightnessRaw)
    ? Math.min(1, Math.max(0, brightnessRaw))
    : 0.58;
  const useBlockquote2 = hero.homeUseBlockquote2 === true;
  const renderedLeftTopHtml = useMemo(
    () =>
      useBlockquote2
        ? applyBlockqoute2ToLastTextElement(leftTopHtml)
        : leftTopHtml,
    [leftTopHtml, useBlockquote2],
  );
  const buttons = useMemo<HomepageButton[]>(
    () => page.defaultHomepageButtons ?? [],
    [page.defaultHomepageButtons],
  );
  const initialButton = useMemo(
    () => buttons.find((button) => button.isFeatured) ?? buttons[0],
    [buttons],
  );
  const [selectedSlug, setSelectedSlug] = useState<string>(
    initialButton?.slug || deriveSlugFromHref(initialButton?.href) || "",
  );
  const [previewLoading, setPreviewLoading] = useState(true);
  const [openMegaIndex, setOpenMegaIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const selectedPreviewSlug = useMemo(
    () => selectedSlug || buttons[0]?.slug || "",
    [selectedSlug, buttons],
  );
  const blockquoteStyle = (hero.blockquoteStyle ?? {}) as {
    bg?: string;
    border?: string;
  };
  const footerHtml = String(page.footerHtml ?? "").trim();
  const showFooter = footerHtml.length > 0;
  const footerBgColor = String((hero.footerBgColor as string) ?? "#ffffff");
  const pageStyleVars =
    blockquoteStyle && (blockquoteStyle.bg || blockquoteStyle.border)
      ? ({
          ["--blockquote-bg" as any]: blockquoteStyle.bg,
          ["--blockquote-border" as any]: blockquoteStyle.border,
        } as CSSProperties)
      : undefined;
  const [menuLoading, setMenuLoading] = useState(false);

  function openSelectedOriginalPage() {
    if (!selectedPreviewSlug) return;
    window.open(
      `/${encodeURIComponent(selectedPreviewSlug)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (navRef.current?.contains(target)) return;
      setOpenMegaIndex(null);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="custom min-h-[calc(100vh)] bg-[#0f2342] text-white default-homepage" style={pageStyleVars}>
      <header className="border-b border-white bg-white text-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <div className="text-sm font-semibold">
            {page.domain.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.domain.logoUrl} alt={page.domain.displayName} className="h-10 w-auto max-h-[80px]" />
            ) : (
              <span className="text-lg font-normal text-zinc-900" style={{ fontFamily: 'Source Sans 3' }}>{page.domain.displayName}</span>
            )}
          </div>
          <nav ref={navRef} className="flex items-center gap-5 text-sm text-zinc-700">
            {(navLinks.length > 0 ? navLinks : [{ label: "Home", href: "#" }]).map((link, idx) => {
              const columns = Array.isArray(link.megaMenuColumns)
                ? link.megaMenuColumns
                : [];
              const hasMega = columns.length > 0;
              return (
                <div
                  key={`${link.label ?? "nav"}-${idx}`}
                  className="group/nav relative flex h-[90px] items-center"
                >
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-medium text-[16px] transition-all duration-250 ${
                      hasMega
                        ? openMegaIndex === idx
                          ? "text-zinc-900"
                          : "text-zinc-600 hover:text-zinc-900"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                    onClick={(e) => {
                      if (hasMega) {
                        e.preventDefault();
                        setMenuLoading(true);
                        setOpenMegaIndex((current) => (current === idx ? null : idx));
                        setTimeout(() => setMenuLoading(false), 200);
                        return;
                      }
                      window.location.href = resolveNavHref(link.href);
                    }}
                  >
                    {link.label ?? "Link"}
                    {hasMega && (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-300 ease-out ${
                          openMegaIndex === idx ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    )}
                  </button>
                  {hasMega && (
                    <div
                      className={`absolute right-0 top-[90px] z-100 min-w-[460px] rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-[0_18px_50px_rgba(16,24,40,0.22)] backdrop-blur-sm transition-all duration-300 ease-out ${
                        openMegaIndex === idx
                          ? "visible translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none invisible -translate-y-2 scale-[0.985] opacity-0"
                      }`}
                    >
                      
                      <div className="grid grid-cols-2 gap-4 z-[100]">
                        {columns.map((column, colIdx) => (
                          <div
                            key={`${idx}-mega-${colIdx}`}
                            className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              {column.title ?? "Column"}
                            </p>
                            <ul className="mt-2.5 space-y-1.5 !list-none !my-[5px]">
                              {safeArray<NavLink>(column.links).map((item, itemIdx) => (
                                <li key={`${idx}-mega-item-${colIdx}-${itemIdx}`}>
                                  <a
                                    href={resolveNavHref(item.href)}
                                    className="group/link inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 transition-all duration-200  hover:text-zinc-900 focus-visible:bg-white focus-visible:text-zinc-900"
                                  >
                                    <span className="text-zinc-300 transition-colors duration-200 group-hover/link:text-zinc-500 group-focus-visible/link:text-zinc-500">
                                      -
                                    </span>
                                    <span className="transition-transform duration-200 group-hover/link:translate-x-0.5 group-focus-visible/link:translate-x-0.5">
                                      {item.label ?? "Item"}
                                    </span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      <section
        className="relative overflow-hidden"
        style={
          {
            height: "calc(100vh - 65px)",
          }
        }
      >
        {backgroundImageUrl && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: `brightness(${brightness})`,
            }}
          />
        )}
        {/* <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, rgba(18,45,84,0.88), rgba(43,81,126,0.62))",
          }}
        /> */}
        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[50%_50%] md:items-center">
          <div className="space-y-6">
            <div
              className="prose prose-invert max-w-none [&_p]:text-white/85"
              dangerouslySetInnerHTML={{ __html: renderedLeftTopHtml }}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buttons.map((item) => {
                const itemSlug = item.slug || deriveSlugFromHref(item.href);
                return (
                  <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const derivedSlug = itemSlug;
                    if (derivedSlug) {
                      setPreviewLoading(true);
                      setSelectedSlug(derivedSlug);
                      return;
                    }
                    const href = resolveNavHref(item.href ?? "");
                    const target = item.target === "_blank" ? "_blank" : "_self";
                    if (href !== "#") {
                      window.open(
                        href,
                        target,
                        target === "_blank" ? "noopener,noreferrer" : undefined,
                      );
                    }
                  }}
                  className={`!rounded-[10px] border px-3 py-2 text-left text-sm ${
                    selectedPreviewSlug === itemSlug
                      ? "border-[#f0cd72] bg-[#f0cd72] text-zinc-900"
                      : item.isFeatured
                        ? "border-[#f0cd72]/70 bg-[#f0cd72]/20 text-white"
                        : "border-white/25 bg-white/10 text-white"
                  }`}
                >
                  {item.title}
                  </button>
                );
              })}
            </div>

          </div>

          <div
            className="mx-auto rounded-[28px] p-2 shadow-2xl bg-[#fff] !w-[576px] "
            style={{ width: PREVIEW_BOX_W }}
          >
            {selectedPreviewSlug ? (
              <div
                className="group relative overflow-hidden rounded-[18px]"
                style={{ width: PREVIEW_BOX_W, height: PREVIEW_BOX_H }}
              >
                <iframe
                  aria-hidden
                  src={`/${encodeURIComponent(selectedPreviewSlug)}?preview=1&domain=${encodeURIComponent(page.domain.hostname)}`}
                  className="absolute inset-0 h-full w-full scale-100 border-0 blur-xl"
                  style={{ pointerEvents: "none" }}
                />
                <div className="absolute inset-0 bg-black/15" />
                {previewLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/25 backdrop-blur-sm">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </span>
                    <p className="text-xs font-medium tracking-wide text-white/90">
                      Loading preview...
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={openSelectedOriginalPage}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/45 group-hover:opacity-100 focus-visible:bg-black/45 focus-visible:opacity-100"
                  aria-label="Open original page"
                  title="Open original page"
                >
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-black/35 text-white shadow-lg">
                    <Eye className="h-7 w-7" />
                  </span>
                </button>
                <div className="relative z-10 h-full w-full">
                  <iframe
                    title="Default homepage preview"
                    src={`/${encodeURIComponent(selectedPreviewSlug)}?preview=1&domain=${encodeURIComponent(page.domain.hostname)}`}
                    className="border-0 bg-black"
                    onLoad={() => setPreviewLoading(false)}
                    style={{
                      position: "absolute",
                      left: PREVIEW_OFFSET_X,
                      top: PREVIEW_OFFSET_Y,
                      width: PREVIEW_CANVAS_W,
                      height: PREVIEW_CANVAS_H,
                      transform: `scale(${PREVIEW_SCALE})`,
                      transformOrigin: "top left",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>
            ) : (
              <div
                className="relative overflow-hidden rounded-[18px] border border-white/15 bg-black/40"
                style={{ width: PREVIEW_BOX_W, height: PREVIEW_BOX_H }}
              >
                {masterBackgroundImageUrl || backgroundImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={masterBackgroundImageUrl || backgroundImageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    aria-hidden
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900" />
                )}
                <div className="absolute inset-0 bg-black/45" />
                <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
                  <span className="inline-flex rounded-md border border-white/40 bg-black/55 px-3 py-2 text-sm font-semibold text-white shadow">
                    No published pages available for preview.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      {showFooter && (
        <footer
          className="border-t relative z-20"
          style={{ backgroundColor: footerBgColor }}
        >
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div
              className="prose prose-sm max-w-none text-zinc-700"
              dangerouslySetInnerHTML={{
                __html: wrapLegalSignsHtml(footerHtml),
              }}
            />
          </div>
        </footer>
      )}
    </div>
  );
}

