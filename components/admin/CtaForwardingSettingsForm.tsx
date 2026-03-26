"use client";

import { useMemo, useState, useTransition } from "react";
import {
  type CtaForwardingRule,
  sanitizeCtaTitle,
} from "@/lib/types/ctaForwarding";
import { useAdminToast } from "@/components/admin/useAdminToast";

interface CtaForwardingSettingsFormProps {
  initialRules: CtaForwardingRule[];
}

interface CtaForwardingRow extends CtaForwardingRule {
  id: string;
}

function createRow(id: string, rule?: Partial<CtaForwardingRule>): CtaForwardingRow {
  return {
    id,
    ctaTitle: sanitizeCtaTitle(rule?.ctaTitle ?? ""),
    forwardUrl: rule?.forwardUrl?.trim() ?? "",
  };
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function CtaForwardingSettingsForm({
  initialRules,
}: CtaForwardingSettingsFormProps) {
  const [rows, setRows] = useState<CtaForwardingRow[]>(
    initialRules.map((rule, index) => createRow(`rule-${index}`, rule)),
  );
  const [nextId, setNextId] = useState(rows.length);
  const [isPending, startTransition] = useTransition();
  const { success, error } = useAdminToast();

  const validationErrors = useMemo(() => {
    return rows.map((row) => {
      const title = row.ctaTitle.trim();
      const url = row.forwardUrl.trim();
      return {
        ctaTitle: title.length === 0 ? "CTA title is required." : "",
        forwardUrl:
          url.length === 0
            ? "Forward URL is required."
            : !isAbsoluteHttpUrl(url)
              ? "Forward URL must start with http:// or https://."
              : "",
      };
    });
  }, [rows]);

  const hasValidationErrors = validationErrors.some(
    (item) => !!item.ctaTitle || !!item.forwardUrl,
  );

  function updateRow(
    id: string,
    key: keyof Pick<CtaForwardingRow, "ctaTitle" | "forwardUrl">,
    value: string,
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]:
                key === "ctaTitle" ? sanitizeCtaTitle(value) : value,
            }
          : row,
      ),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, createRow(`rule-${nextId}`)]);
    setNextId((prev) => prev + 1);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasValidationErrors) {
      error("Please fix CTA forwarding validation errors.");
      return;
    }
    const payload: CtaForwardingRule[] = rows.map((row) => ({
      ctaTitle: sanitizeCtaTitle(row.ctaTitle),
      forwardUrl: row.forwardUrl.trim(),
    }));
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/ui-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ctaForwardingRules: payload }),
        });
        if (!res.ok) {
          throw new Error("Failed to update CTA forwarding settings");
        }
        success("CTA forwarding rules saved.");
      } catch {
        error("Failed to save CTA forwarding rules.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          CTA URL Forwarding
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configure global Selector / CTA Titles and their URL forwarding inputs.
          Redirect happens after successful form submission when title matches.
        </p>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-3 text-sm text-zinc-600">
            No CTA forwarding rules configured. Click "Add rule" to create one.
          </p>
        ) : rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-md border border-zinc-200 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Selector / CTA Title
              </label>
              <input
                type="text"
                value={row.ctaTitle}
                onChange={(e) => updateRow(row.id, "ctaTitle", e.target.value)}
                placeholder="Book My Home Valuation"
                className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              {validationErrors[index]?.ctaTitle ? (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors[index].ctaTitle}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                URL forwarding input
              </label>
              <input
                type="url"
                value={row.forwardUrl}
                onChange={(e) => updateRow(row.id, "forwardUrl", e.target.value)}
                placeholder="https://example.com/thank-you"
                className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              {validationErrors[index]?.forwardUrl ? (
                <p className="mt-1 text-xs text-red-600">
                  {validationErrors[index].forwardUrl}
                </p>
              ) : null}
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-red-50"
        >
          Add rule
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

