"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { FormFieldConfig } from "@/lib/types/form";

interface FormFieldProps {
  field: FormFieldConfig;
  register: UseFormRegister<Record<string, any>>;
  errors: FieldErrors<Record<string, any>>;
}

export function FormField({ field, register, errors }: FormFieldProps) {
  const { id, type, label, placeholder, required, options, helperText, optionalSection } = field;
  const error = errors[id]?.message as string | undefined;

  if (type === "hidden") {
    return <input type="hidden" {...register(id)} />;
  }

  const baseClass =
    "block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 font-serif";
  const labelClass = "block text-sm font-medium text-zinc-800 font-serif";

  const radioCheckClass =
    "h-4 w-4 rounded border-zinc-400 text-amber-700 focus:ring-zinc-900 cursor-pointer";

  const fieldContent =
    type === "textarea" ? (
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
      <div className="space-y-2 pt-1">
        {options?.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 text-sm text-zinc-800 font-serif cursor-pointer"
          >
            <input
              type="radio"
              value={opt.value}
              className={radioCheckClass}
              {...register(id, { required })}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    ) : type === "checkbox" ? (
      <div className="space-y-2 pt-1">
        {options?.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 text-sm text-zinc-800 font-serif cursor-pointer"
          >
            <input
              type="checkbox"
              value={opt.value}
              className={radioCheckClass}
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
    );

  const wrapperClass = type === "radio" || type === "checkbox" ? "space-y-2" : "space-y-1";
  const outerClass = type === "radio" || type === "textarea" ? "space-y-3" : "space-y-2";

  if (type === "textarea" && optionalSection) {
    return (
      <div className={outerClass}>
        <div className="rounded-lg bg-white/80 backdrop-blur-sm border border-zinc-200/80 shadow-sm p-4 space-y-3">
          {label && (
            <p className="text-sm font-semibold text-zinc-800 font-serif" dangerouslySetInnerHTML={{ __html: label }} />
          )}
          {helperText && (
            <p className="text-sm text-zinc-700 font-serif" dangerouslySetInnerHTML={{ __html: helperText }} />
          )}
          <textarea
            id={id}
            rows={3}
            placeholder={placeholder}
            className={baseClass}
            {...register(id, { required })}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className={outerClass}>
      <div className={wrapperClass}>
        {label && (
          <label htmlFor={id} className={labelClass}>
            <span dangerouslySetInnerHTML={{ __html: label }} />
          </label>
        )}
        {fieldContent}
      </div>
      {helperText && !error && (
        <p className="text-xs text-zinc-500 font-serif" dangerouslySetInnerHTML={{ __html: helperText }} />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

