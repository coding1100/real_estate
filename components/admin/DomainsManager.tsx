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
  defaultHomepagePageId: string | null;
  defaultHomepageButtonLimit: number;
  defaultHomepageOptions: { id: string; slug: string; label: string }[];
  defaultHomepageButtons: {
    id: string;
    label: string;
    href: string;
    target: "_self" | "_blank";
    styleMode: "light" | "dark";
    isActive: boolean;
    isFeatured: boolean;
    linkedPageId: string | null;
  }[];
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
  const [isBackfillingDefaults, setIsBackfillingDefaults] = useState(false);
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
    defaultHomepagePageId: null,
    defaultHomepageButtonLimit: 9,
    defaultHomepageOptions: [],
    defaultHomepageButtons: [],
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

  function addDraftHomepageButton() {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.defaultHomepageButtons.length + 1;
      return {
        ...prev,
        defaultHomepageButtons: [
          ...prev.defaultHomepageButtons,
          {
            id: `btn-${Date.now()}`,
            label: `Button ${nextIndex}`,
            href: "",
            target: "_self",
            styleMode: "light",
            isActive: true,
            isFeatured: false,
            linkedPageId: null,
          },
        ],
      };
    });
  }

  function updateDraftHomepageButton(
    index: number,
    patch: Partial<DomainRow["defaultHomepageButtons"][number]>,
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.defaultHomepageButtons];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, ...patch };
      return { ...prev, defaultHomepageButtons: next };
    });
  }

  function removeDraftHomepageButton(index: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        defaultHomepageButtons: prev.defaultHomepageButtons.filter(
          (_item, idx) => idx !== index,
        ),
      };
    });
  }

  async function createDedicatedDefaultHomepage(domain: DomainRow) {
    setSavingId(domain.id);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/domains/${domain.id}/default-homepage`, {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json().catch(() => null)) as
          | {
              error?: string;
              page?: { id: string; slug: string; title: string | null; headline: string };
              defaultHomepagePageId?: string;
            }
          | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to create dedicated default homepage.");
        }
        const page = data?.page;
        setDomains((prev) =>
          prev.map((d) => {
            if (d.id !== domain.id) return d;
            const options = [...d.defaultHomepageOptions];
            if (page && !options.some((opt) => opt.id === page.id)) {
              options.unshift({
                id: page.id,
                slug: page.slug,
                label: (page.title ?? "").trim() || page.headline || page.slug,
              });
            }
            return {
              ...d,
              defaultHomepageOptions: options,
              defaultHomepagePageId:
                data?.defaultHomepagePageId ?? d.defaultHomepagePageId,
            };
          }),
        );
        if (editingId === domain.id) {
          setDraft((prev) => {
            if (!prev || prev.id !== domain.id) return prev;
            const pageId = data?.defaultHomepagePageId ?? prev.defaultHomepagePageId;
            const pageLabel =
              (page?.title ?? "").trim() || page?.headline || page?.slug || "";
            const nextOptions = [...prev.defaultHomepageOptions];
            if (page && !nextOptions.some((opt) => opt.id === page.id)) {
              nextOptions.unshift({ id: page.id, slug: page.slug, label: pageLabel });
            }
            return {
              ...prev,
              defaultHomepagePageId: pageId,
              defaultHomepageOptions: nextOptions,
            };
          });
        }
        toastSuccess("Dedicated default homepage created and assigned.");
      } catch (e: any) {
        const message = e?.message ?? "Failed to create dedicated default homepage.";
        setError(message);
        toastError(message);
      } finally {
        setSavingId(null);
      }
    });
  }

  async function backfillDefaultHomepageForAllDomains() {
    setError(null);
    setIsBackfillingDefaults(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/domains/default-homepage/backfill", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json().catch(() => null)) as
          | {
              error?: string;
              ok?: boolean;
              createdCount?: number;
              linkedCount?: number;
              totalDomains?: number;
            }
          | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to backfill default home pages.");
        }
        toastSuccess(
          `Default home pages updated: ${data?.linkedCount ?? 0}/${data?.totalDomains ?? 0}. Created: ${data?.createdCount ?? 0}.`,
        );
        window.location.reload();
      } catch (e: any) {
        const message = e?.message ?? "Failed to backfill default home pages.";
        setError(message);
        toastError(message);
      } finally {
        setIsBackfillingDefaults(false);
      }
    });
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
          defaultHomepagePageId:
            data.domain.defaultHomepagePageId != null
              ? String(data.domain.defaultHomepagePageId)
              : null,
          defaultHomepageButtonLimit:
            typeof data.domain.defaultHomepageButtonLimit === "number"
              ? data.domain.defaultHomepageButtonLimit
              : domain.defaultHomepageButtonLimit,
          defaultHomepageOptions: domain.defaultHomepageOptions ?? [],
          defaultHomepageButtons: Array.isArray(data.domain.defaultHomepageButtons)
            ? data.domain.defaultHomepageButtons.map((item: any, index: number) => ({
                id: String(item?.id ?? `btn-${index + 1}`),
                label: String(item?.label ?? ""),
                href: String(item?.href ?? ""),
                target: item?.target === "_blank" ? "_blank" : "_self",
                styleMode: item?.styleMode === "dark" ? "dark" : "light",
                isActive: item?.isActive !== false,
                isFeatured: item?.isFeatured === true,
                linkedPageId:
                  item?.linkedPageId != null ? String(item.linkedPageId) : null,
              }))
            : domain.defaultHomepageButtons ?? [],
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
      defaultHomepagePageId: null,
      defaultHomepageButtonLimit: 9,
      defaultHomepageOptions: [],
      defaultHomepageButtons: [],
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
            defaultHomepagePageId: null,
            defaultHomepageButtonLimit: 9,
            defaultHomepageButtons: [],
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
          defaultHomepagePageId:
            created.defaultHomepagePageId != null
              ? String(created.defaultHomepagePageId)
              : null,
          defaultHomepageButtonLimit:
            typeof created.defaultHomepageButtonLimit === "number"
              ? (created.defaultHomepageButtonLimit as number)
              : 9,
          defaultHomepageOptions: [],
          defaultHomepageButtons: Array.isArray(created.defaultHomepageButtons)
            ? (created.defaultHomepageButtons as any[]).map((item, index) => ({
                id: String(item?.id ?? `btn-${index + 1}`),
                label: String(item?.label ?? ""),
                href: String(item?.href ?? ""),
                target: item?.target === "_blank" ? "_blank" : "_self",
                styleMode: item?.styleMode === "dark" ? "dark" : "light",
                isActive: item?.isActive !== false,
                isFeatured: item?.isFeatured === true,
                linkedPageId:
                  item?.linkedPageId != null ? String(item.linkedPageId) : null,
              }))
            : [],
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          Domains
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={backfillDefaultHomepageForAllDomains}
            disabled={isBackfillingDefaults || isPending}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBackfillingDefaults ? "Creating default homes..." : "Backfill default homes"}
          </button>
        <button
          type="button"
          onClick={openAddDialog}
            className="inline-flex items-center gap-2 rounded-lg bg-[#18181b] px-[15px] py-[10px] text-[18px] !rounded-lg font-semibold text-white shadow-sm hover:bg-[#000000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#228BE6]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </button>
        </div>
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
                  <div className="grid gap-4 md:grid-cols-1">
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

                      <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-4 space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                            Default Home Experience
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Control homepage source, button count, and custom CTA cards.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block text-[13px] font-semibold text-zinc-700">
                              Default home page
                            </label>
                            <p className="text-xs text-zinc-500">
                              Choose which published page opens at "/" for this domain.
                            </p>
                            {isEditing ? (
                              <select
                                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm"
                                value={current.defaultHomepagePageId ?? ""}
                                onChange={(e) =>
                                  updateDraft({
                                    defaultHomepagePageId: e.target.value || null,
                                  })
                                }
                              >
                                <option value="">No fixed homepage</option>
                                {current.defaultHomepageOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label} (/{opt.slug})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-800">
                                {d.defaultHomepageOptions.find(
                                  (opt) => opt.id === d.defaultHomepagePageId,
                                )?.label ?? "No fixed homepage"}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[13px] font-semibold text-zinc-700">
                              Number of page buttons
                            </label>
                            <p className="text-xs text-zinc-500">
                              Controls how many page buttons appear on homepage preview (1-24).
                            </p>
                            {isEditing ? (
                              <input
                                type="number"
                                min={1}
                                max={24}
                                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm"
                                value={current.defaultHomepageButtonLimit}
                                onChange={(e) =>
                                  updateDraft({
                                    defaultHomepageButtonLimit: Math.min(
                                      24,
                                      Math.max(1, Number(e.target.value || 9)),
                                    ),
                                  })
                                }
                              />
                            ) : (
                              <p className="rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-800">
                                {d.defaultHomepageButtonLimit}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => createDedicatedDefaultHomepage(current)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                        >
                          Create new default home page
                        </button>

                        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <label className="block text-[13px] font-semibold text-zinc-700">
                              Homepage buttons (custom text + URL)
                            </label>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={addDraftHomepageButton}
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                              >
                                <Plus className="h-3 w-3" />
                                Add button
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">
                            Leave empty to use automatic published-page buttons.
                          </p>
                        {(isEditing
                          ? current.defaultHomepageButtons
                          : d.defaultHomepageButtons
                        ).length === 0 ? (
                          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                            No custom buttons configured.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(isEditing
                              ? current.defaultHomepageButtons
                              : d.defaultHomepageButtons
                            ).map((btn, idx) => (
                              <div
                                key={`${btn.id}-${idx}`}
                                className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3"
                              >
                                <div className="grid gap-2 md:grid-cols-4">
                                  {isEditing ? (
                                    <>
                                      <input
                                        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                                        value={btn.label}
                                        onChange={(e) =>
                                          updateDraftHomepageButton(idx, { label: e.target.value })
                                        }
                                        placeholder="Button text"
                                      />
                                      
                                      <select
                                        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs md:col-span-2"
                                        value={btn.linkedPageId ?? ""}
                                        onChange={(e) => {
                                          const nextPageId = e.target.value || null;
                                          const selectedPage = current.defaultHomepageOptions.find(
                                            (option) => option.id === nextPageId,
                                          );
                                          updateDraftHomepageButton(idx, {
                                            linkedPageId: nextPageId,
                                            href: selectedPage
                                              ? `/${selectedPage.slug}`
                                              : btn.href,
                                            label: selectedPage
                                              ? btn.label || selectedPage.label
                                              : btn.label,
                                          });
                                        }}
                                      >
                                        <option value="">Attach page (optional)</option>
                                        {current.defaultHomepageOptions.map((option) => (
                                          <option key={option.id} value={option.id}>
                                            {option.label} (/{option.slug})
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs read-only"
                                        value={btn.href}
                                        readOnly
                                        placeholder="/target-slug or https://example.com"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-xs text-zinc-700">{btn.label || "Untitled"}</p>
                                      <p className="text-xs text-zinc-500 break-all">{btn.href || "—"}</p>
                                    </>
                                  )}
                                </div>
                                {isEditing && (
                                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                                    <label className="inline-flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={btn.isActive}
                                        onChange={(e) =>
                                          updateDraftHomepageButton(idx, {
                                            isActive: e.target.checked,
                                          })
                                        }
                                      />
                                      Active
                                    </label>
                                    <select
                                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                                      value={btn.target}
                                      onChange={(e) =>
                                        updateDraftHomepageButton(idx, {
                                          target:
                                            e.target.value === "_blank"
                                              ? "_blank"
                                              : "_self",
                                        })
                                      }
                                    >
                                      <option value="_self">Open same tab</option>
                                      <option value="_blank">Open new tab</option>
                                    </select>
                                    <div className="inline-flex items-center rounded-md border border-zinc-300 bg-white p-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateDraftHomepageButton(idx, { styleMode: "light" })
                                        }
                                        className={`rounded px-2 py-1 text-xs font-medium transition ${
                                          btn.styleMode !== "dark"
                                            ? "bg-zinc-900 text-white"
                                            : "text-zinc-600 hover:bg-zinc-100"
                                        }`}
                                      >
                                        Light
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateDraftHomepageButton(idx, { styleMode: "dark" })
                                        }
                                        className={`rounded px-2 py-1 text-xs font-medium transition ${
                                          btn.styleMode === "dark"
                                            ? "bg-zinc-900 text-white"
                                            : "text-zinc-600 hover:bg-zinc-100"
                                        }`}
                                      >
                                        Dark
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeDraftHomepageButton(idx)}
                                      className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
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
                        </div>
                        <div className="space-y-2">
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
                        </div>
                        <div className="space-y-2">
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
