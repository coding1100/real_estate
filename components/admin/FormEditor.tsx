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

  function labelToId(label: string, fallbackIndex: number) {
    const base = label
      .trim()
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-700">
          Fields
        </p>
        <button
          type="button"
          onClick={addField}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
        >
          + Add field
        </button>
      </div>
      <div className="space-y-3">
        {schema.fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 bg-white p-2"
          >
            <div className="flex-1 space-y-2 text-xs">
              <input
                className="w-full rounded border border-zinc-300 px-2 py-1"
                value={field.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  const shouldUpdateId =
                    !field.id || field.id.startsWith("field_");
                  updateField(index, {
                    label: newLabel,
                    ...(shouldUpdateId
                      ? { id: labelToId(newLabel, index) }
                      : {}),
                  });
                }}
              />
              <div className="flex gap-2">
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
              </div>
              <RichTextEditor
                label="Field helper text (rich text)"
                value={field.helperText ?? ""}
                onChange={(html) =>
                  updateField(index, { helperText: html as any })
                }
                placeholder="Optional description under this field."
              />
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

