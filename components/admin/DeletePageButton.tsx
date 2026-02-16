"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";

interface DeletePageButtonProps {
  pageId: string;
  slug: string;
}

export function DeletePageButton({ pageId, slug }: DeletePageButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // ignore
        }
        setError(
          (data && data.error) || "Failed to delete page. Please try again.",
        );
        setLoading(false);
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Failed to delete page. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <Trash2 className="h-3 w-3" />
        <span>Delete</span>
      </button>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete page?"
        description={`Are you sure you want to delete "${slug}"? This action cannot be undone.`}
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
              className="rounded-md border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={loading}
              className="rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

