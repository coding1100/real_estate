"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { FormFieldConfig } from "@/lib/types/form";

interface FormFieldProps {
  field: FormFieldConfig;
  register: UseFormRegister<Record<string, any>>;
  errors: FieldErrors<Record<string, any>>;
}

export function FormField({ field, register, errors }: FormFieldProps) {
  const { id, type, label, placeholder, required, options, helperText } = field;
  const error = errors[id]?.message as string | undefined;

  if (type === "hidden") {
    return <input type="hidden" {...register(id)} />;
  }

  const baseClass =
    "block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900";

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-zinc-800">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          id={id}
          rows={4}
          placeholder={placeholder}
          className={baseClass}
          {...register(id, { required })}
        />
      ) : type === "select" ? (
        <select
          id={id}
          className={baseClass}
          {...register(id, { required })}
          defaultValue=""
        >
          <option value="" disabled>
            {placeholder ?? "Select an option"}
          </option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "radio" ? (
        <div className="space-y-1">
          {options?.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-zinc-800"
            >
              <input
                type="radio"
                value={opt.value}
                {...register(id, { required })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : type === "checkbox" ? (
        <div className="space-y-1">
          {options?.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-zinc-800"
            >
              <input
                type="checkbox"
                value={opt.value}
                {...register(id)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <input
          id={id}
          type={type === "email" ? "email" : "text"}
          placeholder={placeholder}
          className={baseClass}
          {...register(id, { required })}
        />
      )}

      {helperText && !error && (
        <p
          className="text-xs text-zinc-500"
          // helperText is authored by admin via rich text editor
          dangerouslySetInnerHTML={{ __html: helperText }}
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

