"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Plus } from "lucide-react";

interface DomainOption {
  id: string;
  hostname: string;
}

interface TemplateOption {
  id: string;
  type: string;
  name: string;
}

interface PageOption {
  id: string;
  slug: string;
  type: string;
  domainHostname: string;
  domainId: string;
}

interface AddPageDialogProps {
  domains: DomainOption[];
  templates: TemplateOption[];
  defaultTemplate?: string;
  pages?: PageOption[];
  /** Custom trigger: render buttons that call open(template?) to open the dialog with optional template pre-selected. If not set, the default "New page" button is shown. */
  trigger?: (open: (template?: string) => void) => React.ReactNode;
}

export function AddPageDialog({
  domains,
  templates,
  defaultTemplate = "buyer",
  pages = [],
  trigger: triggerRender,
}: AddPageDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"template" | "duplicate">("template");
  const [duplicatePageId, setDuplicatePageId] = useState(
    pages[0]?.id ?? "",
  );
  const [duplicateDomainId, setDuplicateDomainId] = useState(
    pages[0]?.domainId ?? domains[0]?.id ?? "",
  );
  const [duplicateSlug, setDuplicateSlug] = useState(
    pages[0]?.slug ? `${pages[0].slug}-copy` : "",
  );
  const [form, setForm] = useState({
    domainId: domains[0]?.id ?? "",
    template: defaultTemplate,
    slug: "",
    headline: "",
    subheadline: "",
  });

  function openDialog(template?: string) {
    setMode("template");
    setDuplicatePageId(pages[0]?.id ?? "");
    setDuplicateDomainId(pages[0]?.domainId ?? domains[0]?.id ?? "");
    setDuplicateSlug(pages[0]?.slug ? `${pages[0].slug}-copy` : "");
    setForm({
      domainId: domains[0]?.id ?? "",
      template: template ?? defaultTemplate,
      slug: "",
      headline: "",
      subheadline: "",
    });
    setError(null);
    setOpen(true);
  }

  function updateForm(patch: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "duplicate") {
      if (!duplicatePageId) {
        setError("Please select a page to duplicate.");
        return;
      }
      startTransition(async () => {
        try {
          const res = await fetch("/api/admin/pages/duplicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageId: duplicatePageId,
              domainId: duplicateDomainId || null,
              slug: duplicateSlug,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data?.error ?? "Failed to duplicate page");
            return;
          }
          setOpen(false);
          router.push(`/admin/pages/${data.page.id}/edit`);
        } catch (err: unknown) {
          setError(
            err instanceof Error ? err.message : "Failed to duplicate page",
          );
        }
      });
      return;
    }

    if (!form.domainId?.trim() || !form.slug?.trim() || !form.headline?.trim()) {
      setError("Domain, slug, and headline are required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domainId: form.domainId,
            type: form.template,
            slug: form.slug.trim(),
            headline: form.headline.trim(),
            subheadline: form.subheadline?.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Failed to create page");
          return;
        }
        setOpen(false);
        router.push(`/admin/pages/${data.page.id}/edit`);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to create page",
        );
      }
    });
  }

  return (
    <>
      {triggerRender ? (
        triggerRender(openDialog)
      ) : (
        <button
          type="button"
          onClick={() => openDialog()}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          New page
        </button>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New landing page"
        description="Create a new funnel from a master template or duplicate an existing page."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="create-mode"
                value="template"
                checked={mode === "template"}
                onChange={() => setMode("template")}
              />
              <span>Create from template</span>
            </label>
            {pages.length > 0 && (
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="create-mode"
                  value="duplicate"
                  checked={mode === "duplicate"}
                  onChange={() => setMode("duplicate")}
                />
                <span>Duplicate existing page</span>
              </label>
            )}
          </div>

          {mode === "template" ? (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Domain <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.domainId}
                  onChange={(e) => updateForm({ domainId: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  required
                >
                  <option value="">Select domain</option>
                  {domains.map((d: DomainOption) => (
                    <option key={d.id} value={d.id}>
                      {d.hostname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700">
                    Template <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.template}
                    onChange={(e) => updateForm({ template: e.target.value })}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  >
                    {templates.map((t: TemplateOption) => (
                      <option key={t.id} value={t.type}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-700">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateForm({ slug: e.target.value })}
                    placeholder="free-homes-list"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => updateForm({ headline: e.target.value })}
                  placeholder="Free List of Homes in Bend"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Subheadline
                </label>
                <textarea
                  value={form.subheadline}
                  onChange={(e) => updateForm({ subheadline: e.target.value })}
                  placeholder="Optional supporting copy"
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Base page to duplicate <span className="text-red-500">*</span>
                </label>
                <select
                  value={duplicatePageId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDuplicatePageId(value);
                    const selected = pages.find((p) => p.id === value);
                    if (selected) {
                      setDuplicateDomainId(selected.domainId);
                      setDuplicateSlug(`${selected.slug}-copy`);
                    }
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  required
                >
                  <option value="">Select a page</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.domainHostname} — {p.slug} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Domain for new page <span className="text-red-500">*</span>
                </label>
                <select
                  value={duplicateDomainId}
                  onChange={(e) => setDuplicateDomainId(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  required
                >
                  <option value="">Select domain</option>
                  {domains.map((d: DomainOption) => (
                    <option key={d.id} value={d.id}>
                      {d.hostname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700">
                  Slug for new page
                </label>
                <input
                  type="text"
                  value={duplicateSlug}
                  onChange={(e) => setDuplicateSlug(e.target.value)}
                  placeholder="auto-generated if left blank"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending ? "Creating…" : "Create page"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
