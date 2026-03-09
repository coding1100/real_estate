"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import type {
  LandingPageContent,
  BlockConfig,
  HeroElementsByColumn,
  LandingPageType,
} from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { FormEditor } from "@/components/admin/FormEditor";
import { SeoEditor } from "@/components/admin/SeoEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PageBlockLayoutEditor } from "@/components/admin/craft/PageBlockLayoutEditor";
import { DragDropPageLayoutEditor } from "@/components/admin/DragDropPageLayoutEditor";
import { Eye, FileText, ListChecks, Search, LayoutDashboard } from "lucide-react";

interface PageEditorProps {
  initialPage: LandingPageContent & {
    dbId: string;
    domainId: string;
    status?: string;
    multistepStepSlugs?: string[] | null;
  };
}

type Tab = "content" | "form" | "seo" | "layout";

type MultistepCandidate = {
  id: string;
  slug: string;
  headline: string;
  type: LandingPageType;
};

export function PageEditor({ initialPage }: PageEditorProps) {
  const [tab, setTab] = useState<Tab>("content");
  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState<string>(initialPage.status ?? "draft");
  const [multistepStepSlugs, setMultistepStepSlugs] = useState<string[]>(
    Array.isArray(initialPage.multistepStepSlugs) ? initialPage.multistepStepSlugs : [],
  );
  const [pageMode, setPageMode] = useState<"single" | "multistep">(
    Array.isArray(initialPage.multistepStepSlugs) &&
      initialPage.multistepStepSlugs.length > 0
      ? "multistep"
      : "single",
  );
  const [formSchema, setFormSchema] = useState<FormSchema | null>(
    (initialPage.formSchema as any) ?? { fields: [] },
  );
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [availableSteps, setAvailableSteps] = useState<MultistepCandidate[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const layoutGetBlocksRef = useRef<(() => BlockConfig[]) | null>(null);
  const layoutGetHeroElementsRef =
    useRef<(() => HeroElementsByColumn | null) | null>(null);
  const layoutGetLayoutRef = useRef<(() => any[]) | null>(null);

  const heroSections = Array.isArray(page.sections) ? page.sections : [];
  const heroSection =
    heroSections.find((s) => s.kind === "hero") || null;
  const heroLayout = (heroSection?.props as any) || {};

  const layoutData = page.pageLayout?.layoutData as any[] | undefined;
  const savedLayout =
    layoutData && layoutData.length > 0
      ? {
        header: layoutData.find((l: any) => l.i === "header-bar"),
        text: layoutData.find((l: any) => l.i === "text-container"),
        form: layoutData.find((l: any) => l.i === "form-container"),
        footer: layoutData.find((l: any) => l.i === "footer-bar"),
      }
      : undefined;



  function update<K extends keyof LandingPageContent>(
    key: K,
    value: LandingPageContent[K],
  ) {
    setPage((prev) => ({ ...prev, [key]: value }));
  }

  function updateHeroLayout(patch: Record<string, unknown>) {
    setPage((prev) => {
      const sections = Array.isArray(prev.sections) ? [...prev.sections] : [];
      const idx = sections.findIndex((s) => s.kind === "hero");
      if (idx === -1) {
        sections.push({
          id: "hero",
          kind: "hero",
          props: { ...patch },
        } as any);
      } else {
        const existing = sections[idx];
        sections[idx] = {
          ...existing,
          props: { ...(existing.props || {}), ...patch },
        } as any;
      }
      return { ...prev, sections };
    });
  }

  useEffect(() => {
    if (pageMode !== "multistep") return;

    let cancelled = false;
    setStepsLoading(true);
    setStepsError(null);

    fetch(`/api/admin/pages/for-multistep?domainId=${initialPage.domainId}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data?.error ?? "Failed to load pages for multistep flow.");
        }
        const json = (await res.json()) as { pages: MultistepCandidate[] };
        return json.pages;
      })
      .then((pages) => {
        if (cancelled) return;
        const filtered = pages.filter((p) => p.slug !== page.slug);
        setAvailableSteps(filtered);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load pages for multistep flow.";
        setStepsError(msg);
        setAvailableSteps([]);
      })
      .finally(() => {
        if (!cancelled) setStepsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialPage.domainId, page.slug, pageMode]);

  function toggleStepSlug(slug: string, isChecked: boolean) {
    setMultistepStepSlugs((prev) => {
      if (!isChecked) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.includes(slug)) {
        return prev;
      }
      const withNew = [...prev, slug];
      const order = new Map<string, number>();
      availableSteps.forEach((s, index) => {
        order.set(s.slug, index);
      });
      return withNew.sort(
        (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
      );
    });
  }

  async function save(status?: "draft" | "published") {
    setMessage(null);
    startSaving(async () => {
      let sections = page.sections;
      const blocks =
        tab === "layout" && layoutGetBlocksRef.current
          ? layoutGetBlocksRef.current()
          : page.blocks;
      if (tab === "layout" && layoutGetBlocksRef.current) {
        setPage((prev) => ({ ...prev, blocks }));
      }
      if (tab === "layout" && layoutGetHeroElementsRef.current) {
        const heroElements = layoutGetHeroElementsRef.current();
        if (heroElements && Array.isArray(sections)) {
          sections = sections.map((s) =>
            s.kind === "hero"
              ? {
                ...s,
                props: {
                  ...(s.props || {}),
                  heroElements,
                },
              }
              : s,
          );
        }
      }
      const body: any = {
        headline: page.headline,
        subheadline: page.subheadline,
        heroImageUrl: page.heroImageUrl,
        ctaText: page.ctaText,
        successMessage: page.successMessage,
        sections,
        blocks,
        formSchema,
        seoTitle: page.seo.title,
        seoDescription: page.seo.description,
        canonicalUrl: page.seo.canonicalUrl,
        noIndex: page.seo.noIndex,
      };
      body.multistepStepSlugs =
        pageMode === "multistep" && multistepStepSlugs.length > 0
          ? multistepStepSlugs
          : null;

      const getLayout = layoutGetLayoutRef.current;
      if (getLayout) {
        const raw = getLayout();
        if (Array.isArray(raw) && raw.length > 0) {
          body.layoutData = raw.map((item: { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number; static?: boolean; hidden?: boolean }) => ({
            i: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            ...(item.minW != null && { minW: item.minW }),
            ...(item.minH != null && { minH: item.minH }),
            ...(item.static != null && { static: item.static }),
            ...(item.hidden === true && { hidden: true }),
          }));
        }
      }
      if (status) {
        body.status = status;
        setStatus(status);
      }
      const res = await fetch(`/api/admin/pages/${initialPage.dbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage("Failed to save");
        return;
      }
      // Keep local page state in sync with what we just saved so
      // switching tabs does not resurrect older data.
      setPage((prev) => ({
        ...prev,
        sections,
        blocks,
        formSchema,
        ...(body.layoutData
          ? {
            pageLayout: {
              ...(prev.pageLayout ?? {}),
              layoutData: body.layoutData,
            } as any,
          }
          : {}),
      }));
      setMessage(status === "published" ? "Published" : "Saved");

      // Refresh preview iframe so changes are visible - with cache busting
      setTimeout(() => {
        const iframe = document.getElementById(
          "page-preview",
        ) as HTMLIFrameElement | null;
        if (iframe) {
          // Add timestamp to force fresh fetch
          iframe.src = `/${page.slug}?t=${Date.now()}`;
        }
      }, 100);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Edit page
          </h1>
          <p className="text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">{page.slug}</span>
            <span className="px-1">·</span>
            {page.domain.hostname}
            <span className="px-1">·</span>
            <span className="capitalize">{page.type}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status === "published"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200"
              }`}
          >
            {status === "published" ? "Published" : "Draft"}
          </span>
          <div className="flex items-center gap-2 text-sm">
            {status === "published" && (
              <a
                href={`/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                <Eye className="h-3.5 w-3.5" />
                View page
              </a>
            )}
            <button
              type="button"
              onClick={() => save()}
              disabled={saving}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => save("published")}
              disabled={saving}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
      {message && (
        <p className="text-sm text-emerald-700">
          {message}
        </p>
      )}
      <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
          Page mode
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Choose whether this is a normal single-step landing page or a multistep
          entry page that chains together other slugs.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="radio"
              name="page-mode"
              className="h-3.5 w-3.5 border border-zinc-400 text-zinc-900 focus:ring-zinc-900"
              checked={pageMode === "single"}
              onChange={() => setPageMode("single")}
            />
            <span className="font-medium">Single form page</span>
            <span className="text-xs text-zinc-500">
              Edit content, form, SEO, and layout as usual.
            </span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="radio"
              name="page-mode"
              className="h-3.5 w-3.5 border border-zinc-400 text-zinc-900 focus:ring-zinc-900"
              checked={pageMode === "multistep"}
              onChange={() => {
                setPageMode("multistep");
                setTab("content");
              }}
            />
            <span className="font-medium">Multistep form page</span>
            <span className="text-xs text-zinc-500">
              Only configure the step slugs. Other settings are controlled by the
              first step page.
            </span>
          </label>
        </div>
      </div>
      <div className="border-b border-zinc-200">
        <nav className="flex gap-4 text-sm font-medium text-zinc-600">
          {(["content", "form", "seo", "layout"] as Tab[]).map((t) => {
            const isActive = tab === t;
            const Icon =
              t === "content"
                ? FileText
                : t === "form"
                  ? ListChecks
                  : t === "seo"
                    ? Search
                    : LayoutDashboard;
            const label =
              t === "content"
                ? "Content"
                : t === "form"
                  ? "Form"
                  : t === "seo"
                    ? "SEO"
                    : "Layout";
            const disabledInMultistep =
              pageMode === "multistep" && t !== "content";
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (disabledInMultistep) return;
                  setTab(t);
                }}
                aria-disabled={disabledInMultistep}
                className={`inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 pt-1 transition-colors ${
                  isActive
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                } ${
                  disabledInMultistep
                    ? "cursor-not-allowed opacity-40 hover:text-zinc-500"
                    : ""
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="grid gap-6 col-span-1">
        <div className="space-y-4">
          {tab === "content" && (
            <div className="space-y-4">
              {pageMode === "single" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-1">
                    <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                        Hero text & form intro
                      </p>
                      <p className="text-xs text-zinc-500">
                        Control the main hero copy on the left and the short intro above the form on the right.
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-8">
                        {/* LEFT SECTION */}
                        <div className="space-y-3 md:col-span-2 lg:col-span-6">
                          <RichTextEditor
                            label="Hero left: main card (rich text, overrides default text)"
                            value={heroLayout.leftMainHtml ?? ""}
                            onChange={(html) =>
                              updateHeroLayout({ leftMainHtml: html as any })
                            }
                            placeholder="Main hero copy block (domain label, headline, supporting text). Leave empty to use the defaults."
                          />
                        </div>
                        {/* RIGHT SECTION */}
                        <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm md:col-span-2 lg:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                            Hero image
                          </p>
                          <p className="text-xs text-zinc-500">
                            This image appears behind the hero content on the public landing page.
                          </p>
                          <ImageUploader
                            label="Hero image"
                            value={page.heroImageUrl ?? null}
                            onChange={(url) =>
                              update("heroImageUrl", url ?? undefined)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Form behavior
                    </p>
                    <p className="text-xs text-zinc-500">
                      Choose how the hero form is presented.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Form layout
                          </label>
                          <select
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            value={(heroLayout.formStyle as string) ?? "default"}
                            onChange={(e) =>
                              updateHeroLayout({
                                formStyle: e.target.value as
                                  | "default"
                                  | "questionnaire"
                                  | "detailed-perspective"
                                  | "next-steps",
                              })
                            }
                          >
                            <option value="default">
                              Default (Market Brief – name, email, phone)
                            </option>
                            <option value="questionnaire">
                              Questionnaire (numbered questions, optional section)
                            </option>
                            <option value="detailed-perspective">
                              Detailed Perspective (two-column with profile)
                            </option>
                            <option value="next-steps">
                              Next steps (thank-you panel)
                            </option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <RichTextEditor
                          label="Form heading (rich text)"
                          value={heroLayout.formHeading ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ formHeading: html as any })
                          }
                          placeholder="Request the Market Brief"
                        />
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Form background color
                          </label>
                          <div className="inline-flex items-center gap-2">
                            <input
                              type="color"
                              className="h-9 w-9 rounded-md border border-zinc-300 bg-white"
                              value={heroLayout.formBgColor ?? "#ffffff"}
                              onChange={(e) =>
                                updateHeroLayout({
                                  formBgColor: e.target.value,
                                })
                              }
                            />
                            <input
                              type="text"
                              className="h-9 flex-1 rounded-md border border-zinc-300 px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                              value={heroLayout.formBgColor ?? "#ffffff"}
                              onChange={(e) =>
                                updateHeroLayout({
                                  formBgColor: e.target.value,
                                })
                              }
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 md:col-span-2 lg:col-span-5">
                        <RichTextEditor
                          label="Form intro text (right column, rich text)"
                          value={heroLayout.formIntro ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ formIntro: html as any })
                          }
                          placeholder="Explain what the visitor receives after submitting the form."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Call to action & confirmation
                    </p>
                    <p className="text-xs text-zinc-500">
                      Define the primary button label, success message, and CTA styling shown after the form is submitted.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <RichTextEditor
                          label="CTA text (button label, rich text)"
                          value={page.ctaText ?? ""}
                          onChange={(html) => update("ctaText", html as any)}
                          placeholder="Button label, e.g. Request the Market Brief"
                        />
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700">
                            CTA background color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              className="h-9 w-9 rounded-md border border-zinc-300 bg-white"
                              value={heroLayout.ctaBgColor ?? "#18181b"}
                              onChange={(e) =>
                                updateHeroLayout({
                                  ctaBgColor: e.target.value,
                                })
                              }
                            />
                            <input
                              type="text"
                              className="h-9 flex-1 rounded-md border border-zinc-300 px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                              value={heroLayout.ctaBgColor ?? "#18181b"}
                              onChange={(e) =>
                                updateHeroLayout({
                                  ctaBgColor: e.target.value,
                                })
                              }
                              placeholder="#18181b"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <RichTextEditor
                          label="Success message (rich text)"
                          value={page.successMessage ?? ""}
                          onChange={(html) =>
                            update("successMessage", html as any)
                          }
                          placeholder="Message shown after successful submit."
                        />
                      </div>
                    </div>
                  </div>

                  {(heroLayout.formStyle as string) === "detailed-perspective" && (
                    <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                        Detailed Perspective – profile column
                      </p>
                      <p className="text-xs text-zinc-500">
                        This layout shows a two-column form with a profile card on the right. Use the rich text area for flexible profile content.
                      </p>
                      <div className="space-y-3">
                        <ImageUploader
                          label="Profile image"
                          value={(heroLayout.profileImageUrl as string) ?? null}
                          onChange={(url) =>
                            updateHeroLayout({ profileImageUrl: url ?? undefined })
                          }
                        />
                        <RichTextEditor
                          label="Profile content (rich text)"
                          value={(heroLayout.profileSectionHtml as string) ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ profileSectionHtml: html as string })
                          }
                          placeholder="Optional: rich text for the profile block (name, title, role, phone, email, etc.). When set, this is shown instead of the fields below."
                        />
                      </div>
                      <div className="space-y-3 rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs font-medium text-zinc-600">
                          Additional form text (Detailed Perspective)
                        </p>
                        <RichTextEditor
                          label="Text after CTA button (rich text)"
                          value={(heroLayout.formPostCtaText as string) ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ formPostCtaText: html as string })
                          }
                          placeholder="Optional text shown directly below the Complete Request button."
                        />
                        <RichTextEditor
                          label="Text below form area overall (rich text)"
                          value={(heroLayout.formFooterText as string) ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ formFooterText: html as string })
                          }
                          placeholder="Optional text shown below the entire form panel (e.g. disclaimer, attribution)."
                        />
                      </div>
                    </div>
                  )}

                  {(heroLayout.formStyle as string) === "next-steps" && (
                    <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                        Next steps panel (thank-you layout)
                      </p>
                      <p className="text-xs text-zinc-500">
                        Configure the three-column thank-you panel: the left content block, middle profile block, and supporting image.
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <RichTextEditor
                          label="Next steps – first block (rich text)"
                          value={heroLayout.nextStepsFirstHtml ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({
                              nextStepsFirstHtml: html as string,
                            })
                          }
                          placeholder="Left card content: bullets, text, etc."
                        />
                        <div className="space-y-3">
                          <RichTextEditor
                            label="Next steps – second block (rich text)"
                            value={heroLayout.nextStepsSecondHtml ?? ""}
                            onChange={(html) =>
                              updateHeroLayout({
                                nextStepsSecondHtml: html as string,
                              })
                            }
                            placeholder="Profile card text (name, lines, etc.)"
                          />
                          <ImageUploader
                            label="Next steps – second block image"
                            value={
                              (heroLayout.nextStepsSecondImageUrl as string) ??
                              null
                            }
                            onChange={(url) =>
                              updateHeroLayout({
                                nextStepsSecondImageUrl: url ?? undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="rounded-md border border-dashed border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    This page is configured as a multistep form entry. Only the list of
                    step slugs below is editable here. Content, form fields, SEO, and
                    layout are taken from the first step page.
                  </div>
                  <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Multistep flow (step slugs)
                    </p>
                    <p className="text-xs text-zinc-500">
                      Select published pages on this domain to include in this multistep
                      flow. Each selected page is added to the ordered step list below.
                      The first step controls SEO and layout.
                    </p>
                    <div className="space-y-2 rounded-md border border-zinc-100 bg-zinc-50 p-3">
                      {stepsLoading ? (
                        <p className="text-xs text-zinc-500">Loading available pages…</p>
                      ) : stepsError ? (
                        <p className="text-xs text-red-600">{stepsError}</p>
                      ) : availableSteps.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          No other published pages found for this domain. Publish pages
                          first, then return here to add them as steps.
                        </p>
                      ) : (
                        <>
                          <label className="block text-xs font-medium text-zinc-700">
                            Add step
                          </label>
                          <select
                            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                            defaultValue=""
                            onChange={(e) => {
                              const slug = e.target.value;
                              if (!slug) return;
                              toggleStepSlug(slug, true);
                              e.target.value = "";
                            }}
                          >
                            <option value="">Select a page to add…</option>
                            {availableSteps
                              .filter((s) => !multistepStepSlugs.includes(s.slug))
                              .map((step) => (
                                <option key={step.id} value={step.slug}>
                                  {step.slug} —{" "}
                                  {step.headline || (step.type as string)}
                                </option>
                              ))}
                          </select>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            You can add multiple steps; they will appear in the list
                            below.
                          </p>
                        </>
                      )}
                    </div>
                    <div className="space-y-2 rounded-md border border-zinc-100 bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-700">
                        Current step order
                      </p>
                      {multistepStepSlugs.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          No steps selected yet. Use the selector above to add steps.
                        </p>
                      ) : (
                        <ol className="space-y-1 text-xs">
                          {multistepStepSlugs.map((slug, index) => {
                            const meta = availableSteps.find((s) => s.slug === slug);
                            return (
                              <li
                                key={slug}
                                className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-2 py-1"
                              >
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                    Step {index + 1}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-900">
                                      {slug}
                                    </span>
                                    {meta && (
                                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                                        {meta.type}
                                      </span>
                                    )}
                                  </div>
                                  {meta?.headline && (
                                    <span className="line-clamp-1 text-[11px] text-zinc-500">
                                      {meta.headline}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="ml-2 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-100"
                                  onClick={() => toggleStepSlug(slug, false)}
                                >
                                  Remove
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      This page becomes the entry URL; step content is loaded in order
                      from the steps listed above.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          {tab === "form" && (
            pageMode === "multistep" ? (
              <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
                This page is a multistep entry. Form fields are configured on the
                individual step pages instead of here.
              </div>
            ) : (
              <FormEditor
                value={formSchema}
                onChange={(schema) => setFormSchema(schema)}
              />
            )
          )}
          {tab === "layout" && (
            pageMode === "multistep" ? (
              <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
                This page is a multistep entry. Hero layout and grid positions are
                controlled by the first step page.
              </div>
            ) : (
              <DragDropPageLayoutEditor
                page={page}
                onReady={(getLayout) => {
                  layoutGetLayoutRef.current = getLayout;
                }}
                initialLayout={savedLayout}
              />
            )
          )}
          {tab === "seo" && (
            pageMode === "multistep" ? (
              <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
                This page is a multistep entry. SEO (title, description, canonical)
                should be edited on the first step page; it will be used for the full
                flow.
              </div>
            ) : (
              <SeoEditor
                title={page.headline}
                description={page.subheadline ?? ""}
                url={`https://${page.domain.hostname}/${page.slug}`}
                values={{
                  seoTitle: page.seo.title,
                  seoDescription: page.seo.description,
                  canonicalUrl: page.seo.canonicalUrl,
                  noIndex: page.seo.noIndex ?? false,
                }}
                onChange={(val) =>
                  setPage((prev) => ({
                    ...prev,
                    seo: {
                      ...prev.seo,
                      title: val.seoTitle,
                      description: val.seoDescription,
                      canonicalUrl: val.canonicalUrl,
                      noIndex: val.noIndex,
                    },
                  }))
                }
              />
            )
          )}
        </div>
        <div className="h-[420px] overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm md:h-[560px]">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-600">
              Live preview
            </p>
            <p className="text-xs text-zinc-500">
              /{page.slug}
            </p>
          </div>
          <iframe
            id="page-preview"
            title="Live preview"
            src={`/${page.slug}`}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

