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
import { Eye } from "lucide-react";

interface PageEditorProps {
  initialPage: LandingPageContent & {
    dbId: string;
    domainId: string;
    status?: string;
  };
}

type Tab = "content" | "form" | "seo" | "layout";

export function PageEditor({ initialPage }: PageEditorProps) {
  const [tab, setTab] = useState<Tab>("content");
  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState<string>(initialPage.status ?? "draft");
  const [formSchema, setFormSchema] = useState<FormSchema | null>(
    (initialPage.formSchema as any) ?? { fields: [] },
  );
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
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

      if (status === "published") {
        await fetch("/api/admin/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: page.domain.hostname,
            slug: page.slug,
          }),
        });
      }

      // Refresh preview iframe so changes are visible
      const iframe = document.getElementById(
        "page-preview",
      ) as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.location.reload();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
            Edit page: {page.slug}
          </h1>
          <p className="text-xs text-zinc-500">
            {page.domain.hostname} · {page.type}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {status === "published" && (
            <a
              href={`/${page.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-300 px-3 py-1 font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <Eye className="h-3.5 w-3.5" />
              View page
            </a>
          )}
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="rounded-md border border-zinc-300 px-3 py-1 font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => save("published")}
            disabled={saving}
            className="rounded-md bg-zinc-900 px-3 py-1 font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
      {message && (
        <p className="text-xs text-emerald-600">
          {message}
        </p>
      )}
      <div className="flex gap-4 text-xs">
        {(["content", "form", "seo", "layout"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 ${
              tab === t
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid gap-6 ">
        <div className="space-y-4 ">
          {tab === "content" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-3">
                  <RichTextEditor
                    label="Hero left: main card (rich text, overrides default text)"
                    value={heroLayout.leftMainHtml ?? ""}
                    onChange={(html) =>
                      updateHeroLayout({ leftMainHtml: html as any })
                    }
                    placeholder="Main hero copy block (domain label, headline, supporting text). Leave empty to use the defaults."
                  />
                  <RichTextEditor
                    label="Form intro text (right column, rich text)"
                    value={heroLayout.formIntro ?? ""}
                    onChange={(html) =>
                      updateHeroLayout({ formIntro: html as any })
                    }
                    placeholder="Explain what the visitor receives after submitting the form."
                  />
                </div>
                <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    Form style
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3">
                      <label className="mb-1 block text-xs font-medium text-zinc-700">
                        Form layout
                      </label>
                      <select
                        className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs"
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
                    <div className="col-span-3 space-y-3">
                      <RichTextEditor
                        label="Form heading (rich text)"
                        value={heroLayout.formHeading ?? ""}
                        onChange={(html) =>
                          updateHeroLayout({ formHeading: html as any })
                        }
                        placeholder="Request the Market Brief"
                      />
                      {(heroLayout.formStyle as string) === "next-steps" && (
                        <div className="space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
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
                          </div>
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
                      )}
                    </div>
                    <div >
                      <label className="mb-1 block text-xs font-medium text-zinc-700">
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
                          className="h-9 flex-1 rounded-md border border-zinc-300 px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
                  <div className="space-y-3 col-span-3">
                    <RichTextEditor
                      label="CTA text (button label, rich text)"
                      value={page.ctaText ?? ""}
                      onChange={(html) => update("ctaText", html as any)}
                      placeholder="Button label, e.g. Request the Market Brief"
                    />
                    <RichTextEditor
                      label="Success message (rich text)"
                      value={page.successMessage ?? ""}
                      onChange={(html) =>
                        update("successMessage", html as any)
                      }
                      placeholder="Message shown after successful submit."
                    />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-700">
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
                          className="h-9 flex-1 rounded-md border border-zinc-300 px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
                </div>
                {(heroLayout.formStyle as string) === "detailed-perspective" && (
                  <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Profile Section (Right Column)
                    </p>
                    <div className="space-y-3">
                      <ImageUploader
                        label="Profile image"
                        value={(heroLayout.profileImageUrl as string) ?? null}
                        onChange={(url) =>
                          updateHeroLayout({ profileImageUrl: url ?? undefined })
                        }
                      />
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700">
                          Name
                        </label>
                        <input
                          type="text"
                          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs"
                          value={(heroLayout.profileName as string) ?? ""}
                          onChange={(e) =>
                            updateHeroLayout({ profileName: e.target.value })
                          }
                          placeholder="Tom Graup"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700">
                          Title
                        </label>
                        <input
                          type="text"
                          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs"
                          value={(heroLayout.profileTitle as string) ?? ""}
                          onChange={(e) =>
                            updateHeroLayout({ profileTitle: e.target.value })
                          }
                          placeholder="Global Real Estate Advisor – Bend, Oregon"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700">
                          Role
                        </label>
                        <input
                          type="text"
                          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs"
                          value={(heroLayout.profileRole as string) ?? ""}
                          onChange={(e) =>
                            updateHeroLayout({ profileRole: e.target.value })
                          }
                          placeholder="Tetherow Resident"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700">
                          Phone
                        </label>
                        <input
                          type="text"
                          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs"
                          value={(heroLayout.profilePhone as string) ?? ""}
                          onChange={(e) =>
                            updateHeroLayout({ profilePhone: e.target.value })
                          }
                          placeholder="(541) 640-0229"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs"
                          value={(heroLayout.profileEmail as string) ?? ""}
                          onChange={(e) =>
                            updateHeroLayout({ profileEmail: e.target.value })
                          }
                          placeholder="tom@bendbutteproperties.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {(heroLayout.formStyle as string) === "detailed-perspective" && (
                  <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Form text (Detailed Perspective)
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
                )}
              </div>
              <div className="space-y-3">
                <ImageUploader
                  label="Hero image"
                  value={page.heroImageUrl ?? null}
                  onChange={(url) =>
                    update("heroImageUrl", url ?? undefined)
                  }
                />
              </div>
            </div>
          )}
          {tab === "form" && (
            <FormEditor
              value={formSchema}
              onChange={(schema) => setFormSchema(schema)}
            />
          )}
          {tab === "layout" && (
            <DragDropPageLayoutEditor
              page={page}
              onReady={(getLayout) => {
                layoutGetLayoutRef.current = getLayout;
              }}
              initialLayout={savedLayout}
            />
          )}
          {tab === "seo" && (
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
          )}
        </div>
        <div className="h-[600px] overflow-hidden rounded-md border border-zinc-200 bg-white">
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

