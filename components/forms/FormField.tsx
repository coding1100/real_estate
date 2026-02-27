"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { FormFieldConfig } from "@/lib/types/form";

type FormStyle = "default" | "questionnaire" | "detailed-perspective";

interface FormFieldProps {
  field: FormFieldConfig;
  register: UseFormRegister<Record<string, any>>;
  errors: FieldErrors<Record<string, any>>;
  formStyle?: FormStyle;
}

export function FormField({ field, register, errors, formStyle = "default" }: FormFieldProps) {
  const { id, type, label, placeholder, required, options, helperText, optionalSection } = field;
  const error = errors[id]?.message as string | undefined;

  if (type === "hidden") {
    return <input type="hidden" {...register(id)} />;
  }

  const baseClass =
    formStyle === "detailed-perspective"
      ? "block w-full rounded-md border border-zinc-300 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 font-serif bg-white"
      : "block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 font-serif";
  const labelClass = "block text-sm font-medium text-zinc-800 font-serif";

  const radioCheckClass =
    "form-radio-check h-4 w-4 min-w-4 rounded-sm border border-zinc-400 bg-white appearance-none cursor-pointer " +
    "checked:bg-transparent checked:border-zinc-400 focus:ring-2 focus:ring-zinc-900 focus:ring-offset-0";

  const fieldContent =
    type === "textarea" ? (
      <textarea
        id={id}
        rows={1}
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
      formStyle === "detailed-perspective" ? (
        <ul className="space-y-3 pt-2 text-sm text-zinc-800 font-serif detailed-perspective-radio-list">
          {options?.map((opt) => (
            <li key={opt.value} className="relative pl-5">
              <label className="flex items-start cursor-pointer group">
                <input
                  type="radio"
                  value={opt.value}
                  className="form-radio-check-detailed-hidden sr-only peer"
                  {...register(id, { required })}
                />
                <span className="flex-1 leading-relaxed peer-checked:font-medium">{opt.label}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
          {options?.map((opt) => (
            <label
              key={opt.value}
              className="inline-flex items-center gap-2 text-sm text-zinc-800 font-serif cursor-pointer"
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
      )
    ) : type === "checkbox" ? (
      <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
        {options?.map((opt) => (
          <label
            key={opt.value}
            className="inline-flex items-center gap-2 text-sm text-zinc-800 font-serif cursor-pointer"
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
  const outerClass = 
    formStyle === "detailed-perspective" && type === "radio"
      ? "space-y-0"
      : type === "radio" || type === "textarea"
      ? "space-y-3"
      : "space-y-2";

  if (type === "textarea" && optionalSection) {
    return (
      <div className={outerClass}>
        <div className="rounded-lg bg-[#fef6f6] backdrop-blur-sm border border-zinc-200/80 shadow-sm p-4 space-y-3">
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
        {error && <p className="text-md text-red-500">{error}</p>}
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
        <p className="text-md text-zinc-500 font-serif" dangerouslySetInnerHTML={{ __html: helperText }} />
      )}
      {error && <p className="text-md text-red-500">{error}</p>}
    </div>
  );
}

