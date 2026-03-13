"use client";

import { useState, useTransition, useRef } from "react";
import type {
  LandingPageContent,
  BlockConfig,
  HeroElementsByColumn,
} from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { FormEditor } from "@/components/admin/FormEditor";
import { SeoEditor } from "@/components/admin/SeoEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PageBlockLayoutEditor } from "@/components/admin/craft/PageBlockLayoutEditor";
import { DragDropPageLayoutEditor } from "@/components/admin/DragDropPageLayoutEditor";
import { MultistepPageSelector } from "@/components/admin/MultistepPageSelector";
import { Eye, FileText, ListChecks, Search, LayoutDashboard } from "lucide-react";
import { useAdminToast } from "@/components/admin/useAdminToast";

interface PageEditorProps {
  initialPage: LandingPageContent & {
    dbId: string;
    domainId: string;
    status?: string;
    multistepStepSlugs?: string[] | null;
  };
}

type Tab = "content" | "form" | "seo" | "layout";

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
  const [socialOverrides, setSocialOverrides] = useState<
    LandingPageContent["socialOverrides"]
  >((initialPage as any).socialOverrides ?? null);
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const layoutGetBlocksRef = useRef<(() => BlockConfig[]) | null>(null);
  const layoutGetHeroElementsRef =
    useRef<(() => HeroElementsByColumn | null) | null>(null);
  const layoutGetLayoutRef = useRef<(() => any[]) | null>(null);
  const { success: successToast, error: errorToast } = useAdminToast();

  const heroSections = Array.isArray(page.sections) ? page.sections : [];
  const heroSection = heroSections.find((s) => s.kind === "hero") || null;
  const heroLayout = (heroSection?.props as any) || {};

  // Treat the dedicated /home-value entry page and any pages generated from it
  // (e.g. /home-value(questionnaire), /home-value(thankyou), etc.) as part of
  // the Home Value family. Other pages should not show the specialized
  // home-value-only fields like the lower strip or form/map footer.
  const isHomeValueFamily = page.slug === "home-value" || page.slug.startsWith("home-value");

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
        footerHtml: (page as any).footerHtml ?? null,
        sections,
        blocks,
        formSchema,
        socialOverrides,
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
        errorToast(
          status === "published"
            ? "Failed to publish page. Please try again."
            : "Failed to save draft. Please try again.",
        );
        return;
      }
      // Keep local page state in sync with what we just saved so
      // switching tabs does not resurrect older data.
      setPage((prev) => ({
        ...prev,
        sections,
        blocks,
        formSchema,
        socialOverrides,
        ...(body.layoutData
          ? {
            pageLayout: {
              ...(prev.pageLayout ?? {}),
              layoutData: body.layoutData,
            } as any,
          }
          : {}),
      }));
      const isPublishing = status === "published";
      setMessage(isPublishing ? "Published" : "Saved");
      successToast(
        isPublishing ? "Page published." : "Draft saved.",
        isPublishing ? "Published" : "Saved",
      );

      // Refresh preview iframe so changes are visible - with cache busting
      setTimeout(() => {
        const iframe = document.getElementById(
          "page-preview",
        ) as HTMLIFrameElement | null;
        if (iframe) {
          // Add timestamp to force fresh fetch
          iframe.src = `/${page.slug}?preview=1&t=${Date.now()}`;
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
        <div className="flex items-center gap-3 max-[768px]:flex-col max-[768px]:items-stretch">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status === "published"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200"
              }`}
          >
            {status === "published" ? "Published" : "Draft"}
          </span>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                if (status === "published") {
                  window.open(`/${page.slug}`, "_blank", "noopener,noreferrer");
                } else {
                  errorToast(
                    "In order to view this page on the live URL, please publish it first.",
                    "Publish required",
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              <Eye className="h-3.5 w-3.5" />
              View page
            </button>
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
      <div className="border-b border-zinc-200 max-[768px]:overflow-x-auto max-[768px]:pb-1">
        <nav className="flex gap-4 text-sm font-medium text-zinc-600">
          {(isHomeValueFamily
            ? (["content", "form", "seo"] as Tab[])
            : (["content", "form", "seo", "layout"] as Tab[])
          ).map((t) => {
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
                className={`inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 pt-1 transition-colors ${isActive
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                  } ${disabledInMultistep
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
                            height={330}
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
                          <p className="text-[11px] text-zinc-500">
                            JPG, PNG, WEBP, or SVG only. Maximum size 25&nbsp;MB.
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
                        <div className="space-y-3">
                          <RichTextEditor
                            label="Form heading (rich text)"
                            value={heroLayout.formHeading ?? ""}
                            onChange={(html) =>
                              updateHeroLayout({ formHeading: html as any })
                            }
                            placeholder="Request the Market Brief"
                            height={286}
                          />
                        </div>
                      </div>
                      <div className="space-y-3 ">
                      <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-700">
                              Form background color
                            </label>
                            <div className="flex items-center gap-2">
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
                        <RichTextEditor
                          label="Form intro text (right column, rich text)"
                          value={heroLayout.formIntro ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ formIntro: html as any })
                          }
                          placeholder="Explain what the visitor receives after submitting the form."
                          height={286}
                        />
                      </div>
                    </div>

                    {isHomeValueFamily && (
                      <div className="mt-4 space-y-4 border-t border-dashed border-zinc-200 pt-3">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-zinc-600">
                            Lower strip text (between hero and map)
                          </p>
                          <RichTextEditor
                            label="Hero lower strip (rich text)"
                            value={(heroLayout.heroLowerStripHtml as string) ?? ""}
                            onChange={(html) =>
                              updateHeroLayout({
                                heroLowerStripHtml: html as string,
                              })
                            }
                            placeholder="Short line of text shown in the colored strip between the hero and the map."
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-zinc-600">
                            Text below form / map (rich text)
                          </p>
                          <RichTextEditor
                            label="Form & map footer text"
                            value={(heroLayout.formFooterText as string) ?? ""}
                            onChange={(html) =>
                              updateHeroLayout({ formFooterText: html as string })
                            }
                            placeholder="Optional footer text shown below the form or map (e.g. disclaimer, attribution, confidentiality)."
                          />
                        </div>
                      </div>
                    )}
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
                          height={286}
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
                          height={286}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Page footer
                    </p>
                    <p className="text-xs text-zinc-500">
                      Full-width footer content shown at the very bottom of the page. Leave empty to hide the footer.
                    </p>
                    <RichTextEditor
                      label="Footer (rich text)"
                      value={(page as any).footerHtml ?? ""}
                      onChange={(html) => update("footerHtml", html as any)}
                      placeholder="Optional footer text (e.g. brokerage disclaimers, licensing, copyright)."
                    />
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
                        <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-3 md:col-span-3">
                        <RichTextEditor
                          label="Profile content (rich text)"
                          value={(heroLayout.profileSectionHtml as string) ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ profileSectionHtml: html as string })
                          }
                          placeholder="Optional: rich text for the profile block (name, title, role, phone, email, etc.). When set, this is shown instead of the fields below."
                        />
                        </div>
                        <div className="space-y-3 md:col-span-1">
                        <ImageUploader
                          label="Profile image"
                          value={(heroLayout.profileImageUrl as string) ?? null}
                          onChange={(url) =>
                            updateHeroLayout({ profileImageUrl: url ?? undefined })
                          }
                        />
                        </div>
                        
                        </div>
                        
                        
                      </div>
                      <div className="space-y-3 rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs font-medium text-zinc-600">
                          Additional form text (Detailed Perspective)
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 md:col-span-1">
                        <RichTextEditor
                          label="Text after CTA button (rich text)"
                          value={(heroLayout.formPostCtaText as string) ?? ""}
                          onChange={(html) =>
                            updateHeroLayout({ formPostCtaText: html as string })
                          }
                          placeholder="Optional text shown directly below the Complete Request button."
                        />
                        </div>
                        <div className="space-y-3 md:col-span-1">
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
                      <div className="space-y-2 rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-3">
                        <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 border border-zinc-400 text-zinc-900 focus:ring-zinc-900"
                            checked={
                              ((heroLayout as any)?.nextStepsSecondOnly as boolean | undefined) ===
                              true
                            }
                            onChange={(e) =>
                              updateHeroLayout({
                                nextStepsSecondOnly: e.target.checked ? true : undefined,
                              })
                            }
                          />
                          <span className="font-medium">
                            Show only profile block + CTA (single-column variant)
                          </span>
                        </label>
                        <p className="text-[11px] text-zinc-500">
                          When enabled, the Next steps layout will render only the middle profile
                          block and CTA button in a single full-width column. This is useful for
                          pages like strategy calls and dedicated thank-you panels.
                        </p>
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
                      Choose pages for each step, in order. The first page controls the
                      SEO and layout for this multistep experience.
                    </p>
                    <MultistepPageSelector
                      domainId={(initialPage as { domainId?: string }).domainId ?? ""}
                      value={multistepStepSlugs}
                      onChange={setMultistepStepSlugs}
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      This page becomes the entry URL; step content is loaded from the
                      selected pages.
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
              <div className="space-y-4">
                <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    Social media icons for this page
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Override or hide social icons for this landing page only. When left
                    blank, icons fall back to the domain-level settings.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {[
                      {
                        key: "linkedin" as const,
                        label: "LinkedIn URL",
                        visibleKey: "linkedinVisible" as const,
                        urlKey: "linkedinUrl" as const,
                      },
                      {
                        key: "google" as const,
                        label: "Google Business URL",
                        visibleKey: "googleVisible" as const,
                        urlKey: "googleUrl" as const,
                      },
                      {
                        key: "facebook" as const,
                        label: "Facebook URL",
                        visibleKey: "facebookVisible" as const,
                        urlKey: "facebookUrl" as const,
                      },
                      {
                        key: "instagram" as const,
                        label: "Instagram URL",
                        visibleKey: "instagramVisible" as const,
                        urlKey: "instagramUrl" as const,
                      },
                      {
                        key: "zillow" as const,
                        label: "Zillow URL",
                        visibleKey: "zillowVisible" as const,
                        urlKey: "zillowUrl" as const,
                      },
                    ].map((item) => {
                      const current = socialOverrides ?? {};
                      const url = (current as any)[item.urlKey] ?? "";
                      const visible = (current as any)[item.visibleKey];
                      const effectiveVisible =
                        typeof visible === "boolean" ? visible : true;
                      return (
                        <div key={item.key} className="space-y-1">
                          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
                            <span>{item.label}</span>
                            <input
                              type="text"
                              value={url}
                              onChange={(e) => {
                                const next = {
                                  ...(socialOverrides ?? {}),
                                  [item.urlKey]:
                                    e.target.value.trim().length > 0
                                      ? e.target.value
                                      : null,
                                } as any;
                                setSocialOverrides(next);
                                setPage((prev) => ({
                                  ...prev,
                                  socialOverrides: next,
                                }));
                              }}
                              className="mt-0.5 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                              placeholder="https://..."
                            />
                          </label>
                          <label className="mt-1 flex items-center gap-1 text-xs text-zinc-600">
                            <input
                              type="checkbox"
                              checked={effectiveVisible}
                              onChange={(e) => {
                                const next = {
                                  ...(socialOverrides ?? {}),
                                  [item.visibleKey]: e.target.checked,
                                } as any;
                                setSocialOverrides(next);
                                setPage((prev) => ({
                                  ...prev,
                                  socialOverrides: next,
                                }));
                              }}
                            />
                            <span>Show this icon on this page</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <FormEditor
                  value={formSchema}
                  onChange={(schema) => setFormSchema(schema)}
                />
              </div>
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
        <div className="h-[588px] overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm md:h-[784px] adj01 mb-[50px]">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-600 ">
              Live preview
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-500">/{page.slug}</p>
              <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-2 py-0.5 rounded-full ${
                    previewDevice === "desktop"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-2 py-0.5 rounded-full ${
                    previewDevice === "mobile"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Mobile
                </button>
              </div>
            </div>
          </div>
          <div className="flex h-full w-full items-center justify-center bg-zinc-50">
            <iframe
              id="page-preview"
              title="Live preview"
              src={`/${page.slug}?preview=1`}
              className={
                previewDevice === "mobile"
                  ? "h-full w-[380px] max-w-full border-0 rounded-[1.25rem] shadow-md"
                  : "w-full border-0 h-[calc(100%_-_80px)]"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

