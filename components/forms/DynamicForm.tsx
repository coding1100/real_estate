"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { FormSchema } from "@/lib/types/form";
import { FormField } from "./FormField";
import { useRecaptcha, RecaptchaScript } from "./Captcha";

interface DynamicFormProps {
  schema: FormSchema;
  submitUrl?: string;
  extraHiddenFields?: Record<string, string | undefined>;
  ctaText: string;
  successMessage: string;
  textSize?: string;
  ctaBgColor?: string;
}

export function DynamicForm({
  schema,
  submitUrl = "/api/leads",
  extraHiddenFields,
  ctaText,
  successMessage,
  textSize,
  ctaBgColor,
}: DynamicFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Record<string, any>>();

  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { execute } = useRecaptcha();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    startTransition(async () => {
      try {
        const honeypot = (values as any).website as string | undefined;
        if (honeypot) {
          // Bot filled hidden field; silently abort.
          setSubmitted(true);
          reset();
          return;
        }

        const token = await execute("lead_submit");

        const payload = {
          ...values,
          ...extraHiddenFields,
          recaptchaToken: token,
        };

        const res = await fetch(submitUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to submit form");
        }

        setSubmitted(true);
        reset();
      } catch (e) {
        console.error(e);
        setError("Something went wrong. Please try again.");
      }
    });
  });

  if (!schema?.fields?.length) {
    return null;
  }

  const sortedFields = [...schema.fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  const formStyle = textSize ? { fontSize: textSize } : undefined;
  const buttonStyle = ctaBgColor ? { backgroundColor: ctaBgColor } : undefined;

  return (
    <>
      <RecaptchaScript />
      <form
        onSubmit={onSubmit}
        className="space-y-4 text-sm"
        style={formStyle}
      >
        {/* Honeypot field for bots */}
        <input
          type="text"
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />

        {sortedFields.map((field) => (
          <FormField
            key={field.id}
            field={field}
            register={register}
            errors={errors}
          />
        ))}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {submitted && !error && successMessage && (
          <p
            className="text-sm text-emerald-600"
            dangerouslySetInnerHTML={{ __html: successMessage }}
          />
        )}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          style={buttonStyle}
        >
          {isPending ? (
            "Submitting..."
          ) : (
            <span dangerouslySetInnerHTML={{ __html: ctaText }} />
          )}
        </button>
      </form>
    </>
  );
}

