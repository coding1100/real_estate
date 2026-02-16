"use client";

import { useState, useTransition } from "react";
import type { LandingPageContent } from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { FormEditor } from "@/components/admin/FormEditor";
import { SeoEditor } from "@/components/admin/SeoEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Eye } from "lucide-react";

interface PageEditorProps {
  initialPage: LandingPageContent & {
    dbId: string;
    domainId: string;
    status?: string;
  };
}

type Tab = "content" | "form" | "seo";

export function PageEditor({ initialPage }: PageEditorProps) {
  const [tab, setTab] = useState<Tab>("content");
  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState<string>(initialPage.status ?? "draft");
  const [formSchema, setFormSchema] = useState<FormSchema | null>(
    (initialPage.formSchema as any) ?? { fields: [] },
  );
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const heroSections = Array.isArray(page.sections) ? page.sections : [];
  const heroSection =
    heroSections.find((s) => s.kind === "hero") || null;
  const heroLayout = (heroSection?.props as any) || {};

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
      const body: any = {
        headline: page.headline,
        subheadline: page.subheadline,
        heroImageUrl: page.heroImageUrl,
        ctaText: page.ctaText,
        successMessage: page.successMessage,
        sections: page.sections,
        formSchema,
        seoTitle: page.seo.title,
        seoDescription: page.seo.description,
        canonicalUrl: page.seo.canonicalUrl,
        noIndex: page.seo.noIndex,
      };
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
        {(["content", "form", "seo"] as Tab[]).map((t) => (
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
                      <RichTextEditor
                        label="Form heading (rich text)"
                        value={heroLayout.formHeading ?? ""}
                        onChange={(html) =>
                          updateHeroLayout({ formHeading: html as any })
                        }
                        placeholder="Request the Market Brief"
                      />
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

