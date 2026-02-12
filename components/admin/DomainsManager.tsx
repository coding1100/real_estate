"use client";

import { useState, useTransition } from "react";

interface DomainRow {
  id: string;
  hostname: string;
  displayName: string;
  notifyEmail: string;
  notifySms: string | null;
  isActive: boolean;
  ga4Id: string | null;
  metaPixelId: string | null;
}

interface DomainsManagerProps {
  initialDomains: DomainRow[];
}

export function DomainsManager({ initialDomains }: DomainsManagerProps) {
  const [domains, setDomains] = useState<DomainRow[]>(initialDomains);
  const [savingId, setSavingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateDomain(id: string, patch: Partial<DomainRow>) {
    setDomains((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
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
        const data = (await res.json()) as { domain: DomainRow };
        setDomains((prev) => {
          if (isNew) {
            // replace the 'new' row with returned one
            return prev
              .filter((d) => d.id !== "new")
              .concat(data.domain);
          }
          return prev.map((d) =>
            d.id === domain.id ? data.domain : d,
          );
        });
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

  function addNewRow() {
    if (domains.find((d) => d.id === "new")) return;
    setDomains((prev) => [
      ...prev,
      {
        id: "new",
        hostname: "",
        displayName: "",
        notifyEmail: "",
        notifySms: null,
        isActive: true,
        ga4Id: null,
        metaPixelId: null,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          Domains
        </h1>
        <button
          type="button"
          onClick={addNewRow}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          + Add domain
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}
      <table className="min-w-full overflow-hidden rounded-2xl bg-white text-xs shadow-sm">
        <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.15em] text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">Hostname</th>
            <th className="px-3 py-2 text-left">Display name</th>
            <th className="px-3 py-2 text-left">Notify email</th>
            <th className="px-3 py-2 text-left">Notify SMS</th>
            <th className="px-3 py-2 text-left">GA4 ID</th>
            <th className="px-3 py-2 text-left">Meta Pixel ID</th>
            <th className="px-3 py-2 text-left">Active</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((d) => (
            <tr key={d.id} className="border-t border-zinc-100">
              <td className="px-3 py-2">
                <input
                  className="w-full rounded border border-zinc-200 px-2 py-1"
                  value={d.hostname}
                  onChange={(e) =>
                    updateDomain(d.id, { hostname: e.target.value })
                  }
                  placeholder="bendhomes.us"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-full rounded border border-zinc-200 px-2 py-1"
                  value={d.displayName}
                  onChange={(e) =>
                    updateDomain(d.id, { displayName: e.target.value })
                  }
                  placeholder="Bend Homes"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-full rounded border border-zinc-200 px-2 py-1"
                  value={d.notifyEmail}
                  onChange={(e) =>
                    updateDomain(d.id, { notifyEmail: e.target.value })
                  }
                  placeholder="you@example.com"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-full rounded border border-zinc-200 px-2 py-1"
                  value={d.notifySms ?? ""}
                  onChange={(e) =>
                    updateDomain(d.id, { notifySms: e.target.value || null })
                  }
                  placeholder="+15551234567"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-full rounded border border-zinc-200 px-2 py-1"
                  value={d.ga4Id ?? ""}
                  onChange={(e) =>
                    updateDomain(d.id, { ga4Id: e.target.value || null })
                  }
                  placeholder="G-XXXXXXX"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-full rounded border border-zinc-200 px-2 py-1"
                  value={d.metaPixelId ?? ""}
                  onChange={(e) =>
                    updateDomain(d.id, {
                      metaPixelId: e.target.value || null,
                    })
                  }
                  placeholder="123456789012345"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={d.isActive}
                  onChange={(e) =>
                    updateDomain(d.id, { isActive: e.target.checked })
                  }
                />
              </td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-1">
                  <button
                    type="button"
                    onClick={() => saveDomain(d)}
                    disabled={isPending}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
                  >
                    {savingId === d.id ? "Saving..." : "Save"}
                  </button>
                  {d.id !== "new" && (
                    <button
                      type="button"
                      onClick={() => deleteDomain(d.id)}
                      disabled={isPending}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {domains.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-3 py-4 text-center text-zinc-500"
              >
                No domains yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

