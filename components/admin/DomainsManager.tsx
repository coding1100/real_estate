"use client";

import { useState, useTransition } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Dialog } from "@/components/ui/Dialog";
import { Pencil, Check, X, Trash2, Plus } from "lucide-react";

interface DomainRow {
  id: string;
  hostname: string;
  displayName: string;
  notifyEmail: string;
  notifySms: string | null;
  isActive: boolean;
  ga4Id: string | null;
  metaPixelId: string | null;
  logoUrl: string | null;
  rightLogoUrl: string | null;
}

interface DomainsManagerProps {
  initialDomains: DomainRow[];
}

export function DomainsManager({ initialDomains }: DomainsManagerProps) {
  const [domains, setDomains] = useState<DomainRow[]>(initialDomains);
  const [savingId, setSavingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DomainRow | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [newDomainForm, setNewDomainForm] = useState<DomainRow>({
    id: "new",
    hostname: "",
    displayName: "",
    notifyEmail: "",
    notifySms: null,
    isActive: true,
    ga4Id: null,
    metaPixelId: null,
    logoUrl: null,
    rightLogoUrl: null,
  });

  function startEdit(domain: DomainRow) {
    setEditingId(domain.id);
    setDraft({ ...domain });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  function updateDraft(patch: Partial<DomainRow>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function saveDomain(domain: DomainRow) {
    setError(null);
    setSavingId(domain.id || "new");
    startTransition(async () => {
      try {
        const isNew = !domain.id || domain.id === "new";
        const url = isNew
          ? "/api/admin/domains"
          : `/api/admin/domains/${domain.id}`;
        const method = isNew ? "POST" : "PATCH";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(domain),
        });
        if (!res.ok) throw new Error("Failed to save domain");
        const data = (await res.json()) as { domain: any };
        const mapped: DomainRow = {
          id: String(data.domain.id),
          hostname: String(data.domain.hostname),
          displayName: String(data.domain.displayName),
          notifyEmail: String(data.domain.notifyEmail),
          notifySms:
            data.domain.notifySms != null
              ? String(data.domain.notifySms)
              : null,
          isActive: Boolean(data.domain.isActive),
          ga4Id: data.domain.ga4Id != null ? String(data.domain.ga4Id) : null,
          metaPixelId:
            data.domain.metaPixelId != null
              ? String(data.domain.metaPixelId)
              : null,
          logoUrl:
            data.domain.logoUrl != null ? String(data.domain.logoUrl) : null,
          rightLogoUrl:
            data.domain.agentPhoto != null
              ? String(data.domain.agentPhoto)
              : null,
        };
        setDomains((prev) => {
          if (isNew) {
            // replace the 'new' row with returned one
            return prev
              .filter((d) => d.id !== "new")
              .concat(mapped);
          }
          return prev.map((d) =>
            d.id === domain.id ? mapped : d,
          );
        });
        setEditingId(null);
        setDraft(null);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Failed to save domain");
      } finally {
        setSavingId(null);
      }
    });
  }

  async function deleteDomain(id: string) {
    if (!confirm("Delete this domain?")) return;
    setError(null);
    setSavingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/domains/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete domain");
        setDomains((prev) => prev.filter((d) => d.id !== id));
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Failed to delete domain");
      } finally {
        setSavingId(null);
      }
    });
  }

  function openAddDialog() {
    setNewDomainForm({
      id: "new",
      hostname: "",
      displayName: "",
      notifyEmail: "",
      notifySms: null,
      isActive: true,
      ga4Id: null,
      metaPixelId: null,
      logoUrl: null,
      rightLogoUrl: null,
    });
    setAddFormError(null);
    setAddDialogOpen(true);
  }

  function updateNewDomainForm(patch: Partial<DomainRow>) {
    setNewDomainForm((prev) => ({ ...prev, ...patch }));
  }

  async function createDomainFromDialog() {
    const { hostname, displayName, notifyEmail } = newDomainForm;
    if (!hostname?.trim() || !displayName?.trim() || !notifyEmail?.trim()) {
      setAddFormError("Hostname, display name, and notify email are required.");
      return;
    }
    setAddFormError(null);
    setSavingId("new");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostname: newDomainForm.hostname.trim(),
            displayName: newDomainForm.displayName.trim(),
            notifyEmail: newDomainForm.notifyEmail.trim(),
            notifySms: newDomainForm.notifySms?.trim() || null,
            isActive: newDomainForm.isActive,
            ga4Id: newDomainForm.ga4Id?.trim() || null,
            metaPixelId: newDomainForm.metaPixelId?.trim() || null,
            logoUrl: newDomainForm.logoUrl || null,
            rightLogoUrl: newDomainForm.rightLogoUrl || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAddFormError(data?.error ?? "Failed to create domain");
          return;
        }
        const created = data.domain as Record<string, unknown>;
        const row: DomainRow = {
          id: String(created.id),
          hostname: String(created.hostname),
          displayName: String(created.displayName),
          notifyEmail: String(created.notifyEmail),
          notifySms: created.notifySms != null ? String(created.notifySms) : null,
          isActive: Boolean(created.isActive),
          ga4Id: created.ga4Id != null ? String(created.ga4Id) : null,
          metaPixelId: created.metaPixelId != null ? String(created.metaPixelId) : null,
          logoUrl: created.logoUrl != null ? String(created.logoUrl) : null,
          rightLogoUrl: created.agentPhoto != null ? String(created.agentPhoto) : null,
        };
        setDomains((prev) => [...prev, row].sort((a, b) => a.hostname.localeCompare(b.hostname)));
        setAddDialogOpen(false);
      } catch (e: any) {
        console.error(e);
        setAddFormError(e.message ?? "Failed to create domain");
      } finally {
        setSavingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          Domains
        </h1>
        <button
          type="button"
          onClick={openAddDialog}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-lg font-medium text-white hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </button>
      </div>

      <Dialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="Add domain"
        description="Create a new branded domain for your landing pages and leads."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDomainFromDialog();
          }}
          className="space-y-4"
        >
          {addFormError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-md text-red-700">
              {addFormError}
            </p>
          )}
          <div className="space-y-2">
            <label className="block text-md font-medium text-zinc-700">
              Hostname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newDomainForm.hostname}
              onChange={(e) => updateNewDomainForm({ hostname: e.target.value })}
              placeholder="bendhomes.us"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-md font-medium text-zinc-700">
              Display name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newDomainForm.displayName}
              onChange={(e) => updateNewDomainForm({ displayName: e.target.value })}
              placeholder="Bend Homes"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-md font-medium text-zinc-700">
              Notify email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={newDomainForm.notifyEmail}
              onChange={(e) => updateNewDomainForm({ notifyEmail: e.target.value })}
              placeholder="you@example.com"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-md font-medium text-zinc-700">
              Notify SMS
            </label>
            <input
              type="text"
              value={newDomainForm.notifySms ?? ""}
              onChange={(e) =>
                updateNewDomainForm({ notifySms: e.target.value || null })
              }
              placeholder="+15551234567"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-md font-medium text-zinc-700">
                GA4 ID
              </label>
              <input
                type="text"
                value={newDomainForm.ga4Id ?? ""}
                onChange={(e) =>
                  updateNewDomainForm({ ga4Id: e.target.value || null })
                }
                placeholder="G-XXXXXXX"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-md font-medium text-zinc-700">
                Meta Pixel ID
              </label>
              <input
                type="text"
                value={newDomainForm.metaPixelId ?? ""}
                onChange={(e) =>
                  updateNewDomainForm({ metaPixelId: e.target.value || null })
                }
                placeholder="123456789012345"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-md font-semibold text-zinc-700">
              <input
                type="checkbox"
                checked={newDomainForm.isActive}
                onChange={(e) =>
                  updateNewDomainForm({ isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Active
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-md font-medium text-zinc-700">
                Logo (left)
              </label>
              <ImageUploader
                label=""
                value={newDomainForm.logoUrl}
                onChange={(url) => updateNewDomainForm({ logoUrl: url ?? null })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-md font-medium text-zinc-700">
                Logo (right)
              </label>
              <ImageUploader
                label=""
                value={newDomainForm.rightLogoUrl}
                onChange={(url) =>
                  updateNewDomainForm({ rightLogoUrl: url ?? null })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setAddDialogOpen(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-md font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending && savingId === "new"}
              className="rounded-md bg-zinc-900 px-4 py-2 text-md font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending && savingId === "new" ? "Creating…" : "Create domain"}
            </button>
          </div>
        </form>
      </Dialog>

      {error && (
        <p className="text-md text-red-500">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {domains.map((d: DomainRow) => {
          const isEditing = editingId === d.id;
          const current = isEditing && draft && draft.id === d.id ? draft : d;

          return (
            <div
              key={d.id}
              className="rounded-sm bg-white p-4 shadow-sm ring-1 ring-zinc-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Top row: hostname + active + edit controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] uppercase tracking-[0.16em] text-zinc-500">
                          Hostname
                        </p>
                        <div className="flex items-center gap-1 text-[14px]">
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              aria-label="Edit hostname"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => draft && saveDomain(draft)}
                                disabled={isPending || !draft}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                aria-label="Save domain"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isPending}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                                aria-label="Cancel edit"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <input
                          className="w-full max-w-xs rounded-md border border-zinc-300 px-2 py-1 text-md"
                          value={current.hostname}
                          onChange={(e) =>
                            updateDraft({ hostname: e.target.value })
                          }
                          placeholder="bendhomes.us"
                        />
                      ) : (
                        <p className="text-sm font-medium text-zinc-900">
                          {d.hostname}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-[14px] font-medium text-zinc-700">
                        <input
                          type="checkbox"
                          checked={current.isActive}
                          disabled={!isEditing}
                          onChange={(e) =>
                            updateDraft({ isActive: e.target.checked })
                          }
                        />
                        Active
                      </label>
                      <div className="flex items-center gap-1 text-[14px]">
                        {d.id !== "new" && !isEditing && (
                          <button
                            type="button"
                            onClick={() => deleteDomain(d.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main editable fields */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-[14px] font-medium text-zinc-700">
                          Display name
                        </label>
                        <div className="flex items-center gap-1">
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              aria-label="Edit display name"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => draft && saveDomain(draft)}
                                disabled={isPending || !draft}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                aria-label="Save domain"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isPending}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                                aria-label="Cancel edit"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-md"
                          value={current.displayName}
                          onChange={(e) =>
                            updateDraft({ displayName: e.target.value })
                          }
                          placeholder="Bend Homes"
                        />
                      ) : (
                        <p className="text-md text-zinc-800">
                          {d.displayName}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-[14px] font-medium text-zinc-700">
                          Notify email
                        </label>
                        <div className="flex items-center gap-1">
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              aria-label="Edit notify email"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => draft && saveDomain(draft)}
                                disabled={isPending || !draft}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                aria-label="Save domain"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isPending}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                                aria-label="Cancel edit"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-md"
                          value={current.notifyEmail}
                          onChange={(e) =>
                            updateDraft({ notifyEmail: e.target.value })
                          }
                          placeholder="you@example.com"
                        />
                      ) : (
                        <p className="text-md text-zinc-800">
                          {d.notifyEmail}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-[14px] font-medium text-zinc-700">
                          Notify SMS
                        </label>
                        <div className="flex items-center gap-1">
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              aria-label="Edit notify SMS"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => draft && saveDomain(draft)}
                                disabled={isPending || !draft}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                aria-label="Save domain"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isPending}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                                aria-label="Cancel edit"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-md"
                          value={current.notifySms ?? ""}
                          onChange={(e) =>
                            updateDraft({
                              notifySms: e.target.value || null,
                            })
                          }
                          placeholder="+15551234567"
                        />
                      ) : (
                        <p className="text-md text-zinc-800">
                          {d.notifySms || "—"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-[14px] font-medium text-zinc-700">
                          GA4 ID
                        </label>
                        <div className="flex items-center gap-1">
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              aria-label="Edit GA4 ID"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => draft && saveDomain(draft)}
                                disabled={isPending || !draft}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                aria-label="Save domain"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isPending}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                                aria-label="Cancel edit"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-md"
                          value={current.ga4Id ?? ""}
                          onChange={(e) =>
                            updateDraft({
                              ga4Id: e.target.value || null,
                            })
                          }
                          placeholder="G-XXXXXXX"
                        />
                      ) : (
                        <p className="text-md text-zinc-800">
                          {d.ga4Id || "—"}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-[14px] font-medium text-zinc-700">
                          Meta Pixel ID
                        </label>
                        <div className="flex items-center gap-1">
                          {!isEditing ? (
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              aria-label="Edit Meta Pixel ID"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => draft && saveDomain(draft)}
                                disabled={isPending || !draft}
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                                aria-label="Save domain"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isPending}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                                aria-label="Cancel edit"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-md"
                          value={current.metaPixelId ?? ""}
                          onChange={(e) =>
                            updateDraft({
                              metaPixelId: e.target.value || null,
                            })
                          }
                          placeholder="123456789012345"
                        />
                      ) : (
                        <p className="text-md text-zinc-800">
                          {d.metaPixelId || "—"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logos row */}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[14px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    Logo (left)
                  </p>
                  <ImageUploader
                    label="Logo"
                    value={current.logoUrl}
                    onChange={(url) => {
                      const next = url ?? null;
                      if (isEditing) {
                        updateDraft({ logoUrl: next });
                      } else {
                        const updated: DomainRow = { ...d, logoUrl: next };
                        setDomains((prev) =>
                          prev.map((dom) => (dom.id === d.id ? updated : dom)),
                        );
                        void saveDomain(updated);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[14px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    Logo (right)
                  </p>
                  <ImageUploader
                    label="Right logo"
                    value={current.rightLogoUrl}
                    onChange={(url) => {
                      const next = url ?? null;
                      if (isEditing) {
                        updateDraft({ rightLogoUrl: next });
                      } else {
                        const updated: DomainRow = {
                          ...d,
                          rightLogoUrl: next,
                        };
                        setDomains((prev) =>
                          prev.map((dom) => (dom.id === d.id ? updated : dom)),
                        );
                        void saveDomain(updated);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {domains.length === 0 && (
          <p className="py-8 text-center text-md text-zinc-500">
            No domains yet. Click &quot;+ Add domain&quot; to create one.
          </p>
        )}
      </div>
    </div>
  );
}
