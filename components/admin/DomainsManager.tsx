"use client";

import { useState, useTransition } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Dialog } from "@/components/ui/Dialog";
import { Pencil, Check, X, Trash2, Plus } from "lucide-react";
import { useAdminToast } from "@/components/admin/useAdminToast";

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
  faviconUrl: string | null;
  linkedinUrl: string | null;
  linkedinVisible: boolean;
  googleUrl: string | null;
  googleVisible: boolean;
  facebookUrl: string | null;
  facebookVisible: boolean;
  instagramUrl: string | null;
  instagramVisible: boolean;
  zillowUrl: string | null;
  zillowVisible: boolean;
}

interface DomainsManagerProps {
  initialDomains: DomainRow[];
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUsPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^[0-9+\-()\s]+$/.test(trimmed)) return false;
  if (trimmed.includes("+") && !trimmed.startsWith("+")) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
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
  faviconUrl: null,
    linkedinUrl: null,
    linkedinVisible: true,
    googleUrl: null,
    googleVisible: true,
    facebookUrl: null,
    facebookVisible: true,
    instagramUrl: null,
    instagramVisible: true,
    zillowUrl: null,
    zillowVisible: true,
  });
  const { success: toastSuccess, error: toastError } = useAdminToast();

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
    const notifyEmail = domain.notifyEmail?.trim() ?? "";
    const notifySms = domain.notifySms?.trim() ?? "";
    if (!isValidEmail(notifyEmail)) {
      const message = "Notify email must be a valid email (e.g., sample@gmail.com).";
      setError(message);
      toastError(message);
      return;
    }
    if (!isValidUsPhone(notifySms)) {
      const message =
        "Notify SMS must be a valid US number (10 digits, or 11 digits starting with 1).";
      setError(message);
      toastError(message);
      return;
    }
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
          credentials: "include",
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
          faviconUrl:
            data.domain.faviconUrl != null
              ? String(data.domain.faviconUrl)
              : null,
          linkedinUrl:
            data.domain.linkedinUrl != null
              ? String(data.domain.linkedinUrl)
              : null,
          linkedinVisible:
            typeof data.domain.linkedinVisible === "boolean"
              ? data.domain.linkedinVisible
              : true,
          googleUrl:
            data.domain.googleUrl != null
              ? String(data.domain.googleUrl)
              : null,
          googleVisible:
            typeof data.domain.googleVisible === "boolean"
              ? data.domain.googleVisible
              : true,
          facebookUrl:
            data.domain.facebookUrl != null
              ? String(data.domain.facebookUrl)
              : null,
          facebookVisible:
            typeof data.domain.facebookVisible === "boolean"
              ? data.domain.facebookVisible
              : true,
          instagramUrl:
            data.domain.instagramUrl != null
              ? String(data.domain.instagramUrl)
              : null,
          instagramVisible:
            typeof data.domain.instagramVisible === "boolean"
              ? data.domain.instagramVisible
              : true,
          zillowUrl:
            data.domain.zillowUrl != null
              ? String(data.domain.zillowUrl)
              : null,
          zillowVisible:
            typeof data.domain.zillowVisible === "boolean"
              ? data.domain.zillowVisible
              : true,
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
        toastSuccess(isNew ? "Domain created successfully." : "Domain updated successfully.");
      } catch (e: any) {
        console.error(e);
        const message = e?.message ?? "Failed to save domain";
        setError(message);
        toastError(message);
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
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to delete domain");
        setDomains((prev) => prev.filter((d) => d.id !== id));
        toastSuccess("Domain deleted successfully.");
      } catch (e: any) {
        console.error(e);
        const message = e?.message ?? "Failed to delete domain";
        setError(message);
        toastError(message);
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
      faviconUrl: null,
      linkedinUrl: null,
      linkedinVisible: true,
      googleUrl: null,
      googleVisible: true,
      facebookUrl: null,
      facebookVisible: true,
      instagramUrl: null,
      instagramVisible: true,
      zillowUrl: null,
      zillowVisible: true,
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
    if (!isValidEmail(notifyEmail)) {
      setAddFormError("Notify email must be a valid email (e.g., sample@gmail.com).");
      return;
    }
    if (!isValidUsPhone(newDomainForm.notifySms ?? "")) {
      setAddFormError(
        "Notify SMS must be a valid US number (10 digits, or 11 digits starting with 1).",
      );
      return;
    }
    setAddFormError(null);
    setSavingId("new");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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
            faviconUrl: newDomainForm.faviconUrl || null,
            linkedinUrl: newDomainForm.linkedinUrl?.trim() || null,
            linkedinVisible: newDomainForm.linkedinVisible,
            googleUrl: newDomainForm.googleUrl?.trim() || null,
            googleVisible: newDomainForm.googleVisible,
            facebookUrl: newDomainForm.facebookUrl?.trim() || null,
            facebookVisible: newDomainForm.facebookVisible,
            instagramUrl: newDomainForm.instagramUrl?.trim() || null,
            instagramVisible: newDomainForm.instagramVisible,
            zillowUrl: newDomainForm.zillowUrl?.trim() || null,
            zillowVisible: newDomainForm.zillowVisible,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const message = data?.error ?? "Failed to create domain";
          setAddFormError(message);
          toastError(message);
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
          faviconUrl: created.faviconUrl != null ? String(created.faviconUrl) : null,
          linkedinUrl:
            created.linkedinUrl != null ? String(created.linkedinUrl) : null,
          linkedinVisible:
            typeof created.linkedinVisible === "boolean"
              ? (created.linkedinVisible as boolean)
              : true,
          googleUrl:
            created.googleUrl != null ? String(created.googleUrl) : null,
          googleVisible:
            typeof created.googleVisible === "boolean"
              ? (created.googleVisible as boolean)
              : true,
          facebookUrl:
            created.facebookUrl != null ? String(created.facebookUrl) : null,
          facebookVisible:
            typeof created.facebookVisible === "boolean"
              ? (created.facebookVisible as boolean)
              : true,
          instagramUrl:
            created.instagramUrl != null ? String(created.instagramUrl) : null,
          instagramVisible:
            typeof created.instagramVisible === "boolean"
              ? (created.instagramVisible as boolean)
              : true,
          zillowUrl:
            created.zillowUrl != null ? String(created.zillowUrl) : null,
          zillowVisible:
            typeof created.zillowVisible === "boolean"
              ? (created.zillowVisible as boolean)
              : true,
        };
        setDomains((prev) => [...prev, row].sort((a, b) => a.hostname.localeCompare(b.hostname)));
        setAddDialogOpen(false);
        toastSuccess("Domain created successfully.");
      } catch (e: any) {
        console.error(e);
        const message = e?.message ?? "Failed to create domain";
        setAddFormError(message);
        toastError(message);
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
          <div className="mt-4 space-y-2">
            <label className="block text-md font-medium text-zinc-700">
              Favicon
              <span className="ml-1 text-xs font-normal text-zinc-500">
                (shown in browser tab; keep it square, ideally ≤ 24×24px)
              </span>
            </label>
            <ImageUploader
              label=""
              value={newDomainForm.faviconUrl}
              onChange={(url) =>
                updateNewDomainForm({ faviconUrl: url ?? null })
              }
            />
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
                      <p className="text-[14px] uppercase tracking-[0.16em] text-zinc-500">
                        Hostname
                      </p>
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
                      <div className="flex items-center gap-2 text-[14px]">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => draft && saveDomain(draft)}
                              disabled={isPending || !draft}
                              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-900 px-2.5 py-1 text-white hover:bg-zinc-800 disabled:opacity-60"
                            >
                              <Check className="h-3 w-3" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                            >
                              <X className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(d)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                            {d.id !== "new" && (
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main editable fields */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[14px] font-medium text-zinc-700">
                        Display name
                      </label>
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

                     

                      <label className="block text-[14px] font-medium text-zinc-700">
                        Notify email
                      </label>
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

                      <label className="block text-[14px] font-medium text-zinc-700">
                        Notify SMS
                      </label>
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
                      <label className="block text-[14px] font-medium text-zinc-700">
                        GA4 ID
                      </label>
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

                      <label className="block text-[14px] font-medium text-zinc-700">
                        Meta Pixel ID
                      </label>
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
                  {/* Social profiles moved to per-page Form tab; domain-level UI hidden */}
                </div>
              </div>

              {/* Logos + favicon row */}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                <div className="space-y-2">
                  <p className="text-[14px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    Favicon
                  </p>
                  <ImageUploader
                    label="Favicon"
                    value={current.faviconUrl}
                    allowedTypes={[
                      "image/x-icon",
                      "image/vnd.microsoft.icon",
                    ]}
                    accept=".ico,image/x-icon,image/vnd.microsoft.icon"
                    typeErrorMessage="Please upload a .ico favicon file."
                    previewClassName="relative w-[50px] h-[50px] overflow-hidden rounded-md flex p-[4px] border border-[#eee] rounded-[2px]"
                    onChange={(url) => {
                      const next = url ?? null;
                      if (isEditing) {
                        updateDraft({ faviconUrl: next });
                      } else {
                        const updated: DomainRow = {
                          ...d,
                          faviconUrl: next,
                        };
                        setDomains((prev) =>
                          prev.map((dom) => (dom.id === d.id ? updated : dom)),
                        );
                        void saveDomain(updated);
                      }
                    }}
                  />
                  <p className="text-[11px] text-zinc-500">
                    <p>Upload Ico file for fav icon.</p> 
                    <p>Upload recommended file max 24px by 24px larger images will be
                    downscaled by browsers.</p>
                  </p>
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
