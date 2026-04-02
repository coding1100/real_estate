"use client";

import { useMemo, useState, useTransition } from "react";
import {
  type CtaForwardingDocument,
  type CtaForwardingNotifyEmail,
  type CtaForwardingRule,
  sanitizeCtaTitle,
} from "@/lib/types/ctaForwarding";
import { useAdminToast } from "@/components/admin/useAdminToast";

interface CtaForwardingSettingsFormProps {
  initialRules: CtaForwardingRule[];
}

interface CtaForwardingRow extends CtaForwardingRule {
  id: string;
  forwardUrl: string;
  forwardEnabled: boolean;
}

function createRow(id: string, rule?: Partial<CtaForwardingRule>): CtaForwardingRow {
  const forwardUrl = rule?.forwardUrl?.trim() ?? "";
  return {
    id,
    ctaTitle: sanitizeCtaTitle(rule?.ctaTitle ?? ""),
    forwardUrl,
    forwardEnabled: rule?.forwardEnabled ?? !!forwardUrl,
    documents: Array.isArray(rule?.documents)
      ? [...rule!.documents!]
      : [],
    notifyEmails: Array.isArray(rule?.notifyEmails)
      ? [...rule!.notifyEmails!]
      : [],
  };
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function isAllowedDocumentFile(file: File) {
  const fileName = (file.name || "").toLowerCase().trim();
  const ext = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  const mime = (file.type || "").toLowerCase();
  const allowedExt = new Set(["pdf", "doc", "docx"]);
  const allowedMime = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);
  return allowedExt.has(ext) || allowedMime.has(mime);
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
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const validationErrors = useMemo(() => {
    return rows.map((row) => {
      const title = row.ctaTitle.trim();
      const url = row.forwardUrl.trim();
      return {
        ctaTitle: title.length === 0 ? "CTA title is required." : "",
        forwardUrl:
          row.forwardEnabled && url.length === 0
            ? "Forward URL is required when forwarding is active."
            : url.length > 0 && !isAbsoluteHttpUrl(url)
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
    key: keyof Pick<CtaForwardingRow, "ctaTitle" | "forwardUrl" | "forwardEnabled">,
    value: string | boolean,
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]:
                key === "ctaTitle"
                  ? sanitizeCtaTitle(String(value))
                  : value,
            }
          : row,
      ),
    );
  }

  function updateDocuments(
    id: string,
    updater: (docs: CtaForwardingDocument[]) => CtaForwardingDocument[],
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              documents: updater(row.documents ?? []),
            }
          : row,
      ),
    );
  }

  function updateNotifyEmails(
    id: string,
    updater: (list: CtaForwardingNotifyEmail[]) => CtaForwardingNotifyEmail[],
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              notifyEmails: updater(row.notifyEmails ?? []),
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
    const payload: CtaForwardingRule[] = rows.map((row) => {
      const base: CtaForwardingRule = {
        ctaTitle: sanitizeCtaTitle(row.ctaTitle),
        forwardEnabled: row.forwardEnabled,
        ...(row.forwardUrl.trim()
          ? { forwardUrl: row.forwardUrl.trim() }
          : {}),
      };
      const docs = (row.documents ?? [])
        .filter(
          (doc) =>
            doc.name?.trim().length &&
            doc.url?.trim().length,
        )
        .map((doc) => ({
          ...doc,
          // Default to true unless explicitly turned off.
          autoSend: doc.autoSend !== false,
        }));
      const emails = (row.notifyEmails ?? [])
        .filter((entry) => entry.email?.trim().length)
        .map((entry) => ({
          ...entry,
          kind: entry.kind === "cc" || entry.kind === "bcc" ? entry.kind : "bcc",
        }));
      return {
        ...base,
        ...(docs.length ? { documents: docs } : {}),
        ...(emails.length ? { notifyEmails: emails } : {}),
      };
    });
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
      className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            CTA URL Forwarding
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Map button titles to destination URLs and optional follow-up assets
            so each CTA can power a complete experience after form submit.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-md border border-amber-700 bg-amber-600 px-3 py-1.5 text-sm font-medium text-amber-50 shadow-sm hover:bg-amber-700"
        >
          <span className="text-lg leading-none">＋</span>
          <span>Add rule</span>
        </button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-3 text-sm text-zinc-600">
            No CTA forwarding rules configured. Click Add rule to create one.
          </p>
        ) : rows.map((row, index) => (
          <div
            key={row.id}
            className="space-y-4 rounded-lg border border-amber-100 bg-amber-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
                    CTA & redirect
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-zinc-600">
                    URL forwarding input
                  </label>
                  <label className="flex items-center gap-2 text-[11px] font-medium text-zinc-600">
                    <span>
                      {row.forwardEnabled ? "Active" : "Inactive"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.forwardEnabled}
                      onClick={() =>
                        updateRow(
                          row.id,
                          "forwardEnabled",
                          !row.forwardEnabled,
                        )
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 !rounded-full border transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400 focus:ring-offset-1 ${
                        row.forwardEnabled
                          ? "border-amber-700 bg-amber-600"
                          : "border-zinc-300 bg-zinc-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          row.forwardEnabled
                            ? "translate-x-4"
                            : "translate-x-0.5"
                        }`}
                        style={{ marginTop: 1 }}
                      />
                    </button>
                  </label>
                </div>
                <input
                  type="url"
                  value={row.forwardUrl}
                  onChange={(e) => updateRow(row.id, "forwardUrl", e.target.value)}
                  placeholder="https://example.com/thank-you"
                  disabled={!row.forwardEnabled}
                  className={`w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                    row.forwardEnabled
                      ? "border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900"
                      : "border-zinc-200 bg-zinc-100 text-zinc-500"
                  }`}
                />
                {validationErrors[index]?.forwardUrl ? (
                  <p className="mt-1 text-xs text-red-600">
                    {validationErrors[index].forwardUrl}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-zinc-500">
                  {row.forwardEnabled
                    ? "Visitors matching this CTA are redirected here after a successful form submission."
                    : "Forwarding is disabled. This CTA will not redirect after submit."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                    Documents to send
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    Optional PDFs, guides, or policies for this CTA.
                  </span>
                </div>
                {(row.documents ?? []).length === 0 ? (
                  <p className="rounded-md border border-dashed border-zinc-200 p-2 text-xs text-zinc-500">
                    No documents added. Use Add document to link guides, privacy
                    policies, etc.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(row.documents ?? []).map((doc, docIndex) => {
                      const ext = (() => {
                        const fromName = (doc.name ?? "").trim();
                        if (fromName.includes(".")) {
                          return fromName.split(".").pop()?.toUpperCase() ?? "";
                        }
                        const fromUrl = (doc.url ?? "").trim();
                        if (fromUrl.includes(".")) {
                          return fromUrl.split(".").pop()?.split("?")[0]?.split("#")[0]?.toUpperCase() ?? "";
                        }
                        return "";
                      })();
                      const uploadKey = `${row.id}-doc-${docIndex}`;
                      return (
                        <div
                          key={`${row.id}-doc-${docIndex}`}
                          className="grid gap-2 rounded-md border border-zinc-200 p-2 text-xs md:grid-cols-[auto_minmax(1,1fr)]"
                        >
                          <div className="flex flex-col items-center justify-center gap-1 px-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-[10px] font-semibold text-zinc-700 shadow-sm">
                              {ext || "FILE"}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-zinc-600">
                                Auto send
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={doc.autoSend !== false}
                                onClick={() =>
                                  updateDocuments(row.id, (docs) =>
                                    docs.map((d, i) =>
                                      i === docIndex
                                        ? { ...d, autoSend: d.autoSend === false }
                                        : d,
                                    ),
                                  )
                                }
                                className={`relative inline-flex h-5 w-9 shrink-0 !rounded-full border transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400 focus:ring-offset-1 ${
                                  doc.autoSend !== false
                                    ? "border-amber-700 bg-amber-600"
                                    : "border-zinc-300 bg-zinc-200"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                    doc.autoSend !== false ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                  style={{ marginTop: 1 }}
                                />
                              </button>
                              <label className="mt-1 inline-flex cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (!isAllowedDocumentFile(file)) {
                                      error("Only .doc, .docx, and .pdf files are allowed.");
                                      e.target.value = "";
                                      return;
                                    }
                                    const MAX_BYTES = 20 * 1024 * 1024; // 20MB
                                    if (file.size > MAX_BYTES) {
                                      error("Document must be smaller than 20MB.");
                                      e.target.value = "";
                                      return;
                                    }
                                    setUploadingKey(uploadKey);
                                    try {
                                      const sigRes = await fetch("/api/upload/signature", {
                                        method: "POST",
                                        headers: { "content-type": "application/json" },
                                        body: JSON.stringify({ kind: "document" }),
                                      });
                                      if (!sigRes.ok) {
                                        throw new Error("Upload failed");
                                      }
                                      const sig = (await sigRes.json()) as {
                                        uploadUrl: string;
                                        apiKey: string;
                                        timestamp: number;
                                        signature: string;
                                        folder: string;
                                        publicId: string;
                                        resourceType: "raw";
                                      };

                                      const cloudForm = new FormData();
                                      cloudForm.append("file", file);
                                      cloudForm.append("api_key", sig.apiKey);
                                      cloudForm.append("timestamp", String(sig.timestamp));
                                      cloudForm.append("signature", sig.signature);
                                      cloudForm.append("folder", sig.folder);
                                      cloudForm.append("public_id", sig.publicId);
                                      cloudForm.append("overwrite", "false");

                                      const uploadRes = await fetch(sig.uploadUrl, {
                                        method: "POST",
                                        body: cloudForm,
                                      });
                                      if (!uploadRes.ok) {
                                        throw new Error("Upload failed");
                                      }
                                      const uploaded = (await uploadRes.json()) as {
                                        secure_url?: string;
                                        original_filename?: string;
                                        public_id?: string;
                                        format?: string;
                                      };
                                      if (!uploaded.secure_url) {
                                        throw new Error("Missing URL from upload");
                                      }
                                      const uploadedUrl = uploaded.secure_url;
                                      updateDocuments(row.id, (docs) =>
                                        docs.map((d, i) =>
                                          i === docIndex
                                            ? {
                                                ...d,
                                                name:
                                                  uploaded.original_filename ||
                                                  d.name ||
                                                  file.name,
                                                url: uploadedUrl,
                                                mimeType:
                                                  file.type || d.mimeType,
                                                publicId:
                                                  uploaded.public_id ||
                                                  (d as any).publicId,
                                                format:
                                                  uploaded.format ||
                                                  (d as any).format,
                                                autoSend:
                                                  d.autoSend !== false,
                                              }
                                            : d,
                                        ),
                                      );
                                    } catch (err) {
                                      console.error(err);
                                      error("Document upload failed.");
                                    } finally {
                                      setUploadingKey(null);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <span>
                                  {uploadingKey === uploadKey
                                    ? "Uploading..."
                                    : "Upload"}
                                </span>
                              </label>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={doc.name}
                              onChange={(e) =>
                                updateDocuments(row.id, (docs) =>
                                  docs.map((d, i) =>
                                    i === docIndex
                                      ? { ...d, name: e.target.value }
                                      : d,
                                  ),
                                )
                              }
                              placeholder="Document name (shown in UI)"
                              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <input
                              type="url"
                              value={doc.url}
                              onChange={(e) =>
                                updateDocuments(row.id, (docs) =>
                                  docs.map((d, i) =>
                                    i === docIndex
                                      ? { ...d, url: e.target.value }
                                      : d,
                                  ),
                                )
                              }
                              placeholder="https://… (SharePoint, Google Docs, etc.)"
                              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  updateDocuments(row.id, (docs) =>
                                    docs.filter((_, i) => i !== docIndex),
                                  )
                                }
                                className="mt-1 rounded-md px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateDocuments(row.id, (docs) => [
                      ...docs,
                      { name: "", url: "", autoSend: true },
                    ])
                  }
                  className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  Add document
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                    Notification emails (BCC / CC)
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    Who should receive alerts for this CTA.
                  </span>
                </div>
                {(row.notifyEmails ?? []).length === 0 ? (
                  <p className="rounded-md border border-dashed border-zinc-200 p-2 text-xs text-zinc-500">
                    No overrides configured. Domain-level notify email will be used.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(row.notifyEmails ?? []).map((entry, emailIndex) => (
                      <div
                        key={`${row.id}-email-${emailIndex}`}
                        className="flex items-center gap-2 rounded-md border border-zinc-200 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <label className="flex flex-col gap-0.5 text-[10px] text-zinc-600">
                            <span>Send</span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={entry.enabled ?? true}
                              onClick={() =>
                                updateNotifyEmails(row.id, (list) =>
                                  list.map((item, i) =>
                                    i === emailIndex
                                      ? {
                                          ...item,
                                          enabled: !(item.enabled ?? true),
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className={`relative inline-flex h-5 w-9 shrink-0 !rounded-full border transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400 focus:ring-offset-1 ${
                                entry.enabled ?? true
                                  ? "border-amber-700 bg-amber-600"
                                  : "border-zinc-300 bg-zinc-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                  entry.enabled ?? true
                                    ? "translate-x-4"
                                    : "translate-x-0.5"
                                }`}
                                style={{ marginTop: 1 }}
                              />
                            </button>
                          </label>
                          <select
                            value={entry.kind === "cc" ? "cc" : "bcc"}
                            onChange={(e) =>
                              updateNotifyEmails(row.id, (list) =>
                                list.map((item, i) =>
                                  i === emailIndex
                                    ? {
                                        ...item,
                                        kind: e.target.value as "cc" | "bcc",
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-[11px] text-zinc-700 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          >
                            <option value="bcc">BCC</option>
                            <option value="cc">CC</option>
                          </select>
                        </div>
                        <input
                          type="email"
                          value={entry.email}
                          onChange={(e) =>
                            updateNotifyEmails(row.id, (list) =>
                              list.map((item, i) =>
                                i === emailIndex
                                  ? { ...item, email: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="team@example.com"
                          className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateNotifyEmails(row.id, (list) =>
                              list.filter((_, i) => i !== emailIndex),
                            )
                          }
                          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateNotifyEmails(row.id, (list) => [
                      ...list,
                      { email: "", enabled: true, kind: "bcc" },
                    ])
                  }
                  className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  Add email
                </button>
              </div>
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

