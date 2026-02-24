"use client";

import { useState } from "react";
import type { FormSchema, FormFieldConfig } from "@/lib/types/form";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface FormEditorProps {
  value: FormSchema | null;
  onChange: (schema: FormSchema) => void;
}

export function FormEditor({ value, onChange }: FormEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const schema: FormSchema =
    value && Array.isArray((value as any).fields)
      ? value
      : { fields: [] };

  function stripHtml(html: string): string {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function labelToId(label: string, fallbackIndex: number) {
    const base = stripHtml(label)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");
    if (!base) return `field_${fallbackIndex + 1}`;
    return base;
  }

  function updateField(index: number, patch: Partial<FormFieldConfig>) {
    const fields = [...schema.fields];
    fields[index] = { ...fields[index], ...patch };
    onChange({ fields });
  }

  function addField() {
    const fields = [
      ...schema.fields,
      {
        id: `field_${schema.fields.length + 1}`,
        type: "text" as const,
        label: "New Field",
        order: schema.fields.length + 1,
      },
    ];
    onChange({ fields });
  }

  function removeField(index: number) {
    const fields = schema.fields.filter((_, i) => i !== index);
    onChange({ fields });
  }

  function handleJsonChange(text: string) {
    try {
      const parsed = JSON.parse(text) as FormSchema;
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        throw new Error("Invalid schema: missing fields array");
      }
      onChange(parsed);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Invalid JSON");
    }
  }

  const loadDefaultContactPreset = () => {
    onChange({
      fields: [
        {
          id: "name",
          type: "text",
          label: "Name",
          placeholder: "Name",
          required: true,
          order: 1,
        },
        {
          id: "email",
          type: "email",
          label: "Email",
          placeholder: "Email",
          required: true,
          order: 2,
        },
        {
          id: "phone",
          type: "phone",
          label: "Phone",
          placeholder: "Phone",
          required: false,
          order: 3,
        },
      ],
    });
  };

  const loadQuestionnairePreset = () => {
    onChange({
      fields: [
        {
          id: "own_property_tetherow",
          type: "radio",
          label: "1. Do you currently own property in Tetherow?",
          required: true,
          order: 1,
          options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
        },
        {
          id: "selling_12_months",
          type: "radio",
          label: "2. Are you considering selling within the next 12 months?",
          required: true,
          order: 2,
          options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
        },
        {
          id: "optional_report_focus",
          type: "textarea",
          label: "Optional:",
          required: false,
          order: 3,
          optionalSection: true,
        },
      ],
    });
  };

  const loadDetailedPerspectivePreset = () => {
    onChange({
      fields: [
        {
          id: "service_type",
          type: "radio",
          label: "",
          required: true,
          order: 1,
          options: [
            { value: "market_review", label: "Schedule a 15-Minute Market Review" },
            { value: "valuation", label: "Request a Confidential Valuation Analysis" },
          ],
        },
        {
          id: "email",
          type: "email",
          label: "",
          placeholder: "Email",
          required: true,
          order: 2,
        },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-700">
          Fields
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadDefaultContactPreset}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Load default contact form
          </button>
          <button
            type="button"
            onClick={loadQuestionnairePreset}
            className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            Load questionnaire preset
          </button>
          <button
            type="button"
            onClick={loadDetailedPerspectivePreset}
            className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            Load detailed perspective preset
          </button>
          <button
            type="button"
            onClick={addField}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
          >
            + Add field
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {schema.fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 bg-white p-2"
          >
            <div className="flex-1 space-y-2 text-xs">
              <RichTextEditor
                label="Field label (rich text – use toolbar for color, font size, etc.)"
                value={field.label ?? ""}
                onChange={(html) => {
                  const newLabel = html as string;
                  const shouldUpdateId =
                    !field.id || field.id.startsWith("field_");
                  updateField(index, {
                    label: newLabel,
                    ...(shouldUpdateId
                      ? { id: labelToId(newLabel, index) }
                      : {}),
                  });
                }}
                placeholder="Question or field label"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="rounded border border-zinc-300 px-2 py-1"
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, {
                      type: e.target.value as FormFieldConfig["type"],
                    })
                  }
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="address">Address</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="radio">Radio</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="hidden">Hidden</option>
                </select>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={field.required ?? false}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                  />
                  <span>Required</span>
                </label>
                {(field.type === "textarea") && (
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={field.optionalSection ?? false}
                      onChange={(e) =>
                        updateField(index, { optionalSection: e.target.checked })
                      }
                    />
                    <span>Optional section style</span>
                  </label>
                )}
              </div>
              {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-zinc-500">
                      Options (value / label)
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const opts = [...(field.options ?? []), { value: "", label: "" }];
                        updateField(index, { options: opts });
                      }}
                      className="text-[11px] text-zinc-600 hover:text-zinc-900"
                    >
                      + Add option
                    </button>
                  </div>
                  {(field.options ?? []).map((opt, oi) => (
                    <div key={oi} className="flex gap-2 items-center">
                      <input
                        className="w-20 rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[11px]"
                        placeholder="value"
                        value={opt.value}
                        onChange={(e) => {
                          const opts = [...(field.options ?? [])];
                          opts[oi] = { ...opts[oi], value: e.target.value };
                          updateField(index, { options: opts });
                        }}
                      />
                      <input
                        className="flex-1 rounded border border-zinc-300 px-1.5 py-0.5"
                        placeholder="label"
                        value={opt.label}
                        onChange={(e) => {
                          const opts = [...(field.options ?? [])];
                          opts[oi] = { ...opts[oi], label: e.target.value };
                          updateField(index, { options: opts });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const opts = (field.options ?? []).filter((_, i) => i !== oi);
                          updateField(index, { options: opts });
                        }}
                        className="text-zinc-400 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeField(index)}
              className="text-xs text-zinc-500 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-zinc-700">
          Raw JSON (advanced)
        </p>
        <textarea
          className="h-40 w-full rounded-md border border-zinc-300 px-2 py-1 text-xs font-mono"
          defaultValue={JSON.stringify(schema, null, 2)}
          onBlur={(e) => handleJsonChange(e.target.value)}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

