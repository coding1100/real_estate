"use client";

import { useState, useTransition } from "react";
import type { LandingPageContent } from "@/lib/types/page";
import type { FormSchema } from "@/lib/types/form";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { FormEditor } from "@/components/admin/FormEditor";
import { SeoEditor } from "@/components/admin/SeoEditor";

interface PageEditorProps {
  initialPage: LandingPageContent & {
    dbId: string;
    domainId: string;
  };
}

type Tab = "content" | "form" | "seo";

export function PageEditor({ initialPage }: PageEditorProps) {
  const [tab, setTab] = useState<Tab>("content");
  const [page, setPage] = useState(initialPage);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(
    (initialPage.formSchema as any) ?? { fields: [] },
  );
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function update<K extends keyof LandingPageContent>(
    key: K,
    value: LandingPageContent[K],
  ) {
    setPage((prev) => ({ ...prev, [key]: value }));
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
        <div className="flex gap-2 text-xs">
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
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Headline
                  </label>
                  <input
                    className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    value={page.headline}
                    onChange={(e) =>
                      update("headline", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Subheadline
                  </label>
                  <textarea
                    className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    rows={3}
                    value={page.subheadline ?? ""}
                    onChange={(e) =>
                      update("subheadline", e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700">
                      CTA text
                    </label>
                    <input
                      className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      value={page.ctaText}
                      onChange={(e) =>
                        update("ctaText", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700">
                      Success message
                    </label>
                    <input
                      className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      value={page.successMessage}
                      onChange={(e) =>
                        update("successMessage", e.target.value)
                      }
                    />
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
            src={`/${page.domain.hostname}/${page.slug}`}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

