"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { FormSchema } from "@/lib/types/form";
import {
  type CtaForwardingRule,
  normalizeCtaTitleKey,
} from "@/lib/types/ctaForwarding";
import { wrapLegalSignsHtml } from "@/lib/richTextSigns";
import { FormField } from "./FormField";
import { useRecaptcha, RecaptchaScript } from "./Captcha";
import { useToast } from "@/components/ui/use-toast";

type FormStyle = "default" | "questionnaire" | "detailed-perspective";

interface DynamicFormProps {
  schema: FormSchema;
  submitUrl?: string;
  extraHiddenFields?: Record<string, string | undefined>;
  ctaText: string;
  successMessage: string;
  textSize?: string;
  ctaBgColor?: string;
  formStyle?: FormStyle;
  helperText?: string;
  postCtaText?: string;
  onNextStep?: (values: Record<string, unknown>) => void;
  skipValidationForNextStep?: boolean;
  ctaForwardingRules?: CtaForwardingRule[];
}

export function DynamicForm({
  schema,
  submitUrl = "/api/leads",
  extraHiddenFields,
  ctaText,
  successMessage,
  textSize,
  ctaBgColor,
  formStyle = "default",
  helperText,
  postCtaText,
  onNextStep,
  skipValidationForNextStep,
  ctaForwardingRules,
}: DynamicFormProps) {
  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors },
    reset,
  } = useForm<Record<string, any>>({
    // When fields are hidden via conditional logic, unregister them so they
    // don't keep stale values/required-validation errors.
    shouldUnregister: true,
  });

  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadRecaptcha, setLoadRecaptcha] = useState(false);
  const { execute } = useRecaptcha();
  const { toast } = useToast();
  const watchedValues = useWatch({ control }) as Record<string, unknown>;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadRecaptcha(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleNextClick = () => {
    if (!onNextStep) return;
    const values = getValues();
    const honeypot = (values as any).website as string | undefined;
    if (honeypot) {
      setSubmitted(true);
      reset();
      return;
    }
    if (!loadRecaptcha) {
      setLoadRecaptcha(true);
    }
    onNextStep(values as Record<string, unknown>);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (!loadRecaptcha) {
      setLoadRecaptcha(true);
    }
    const honeypot = (values as any).website as string | undefined;
    if (honeypot) {
      setSubmitted(true);
      reset();
      return;
    }
    if (onNextStep) {
      onNextStep(values as Record<string, unknown>);
      return;
    }
    startTransition(async () => {
      try {
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
        toast({
          title: "Success",
          description:
            (successMessage &&
              successMessage.replace(/<[^>]+>/g, "").trim()) ||
            "Thank you! We'll be in touch shortly.",
          variant: "default",
        });
        const normalizedCtaText = normalizeCtaTitleKey(ctaText || "");
        const matchingRule = (ctaForwardingRules ?? []).find(
          (rule) => normalizeCtaTitleKey(rule.ctaTitle) === normalizedCtaText,
        );
        if (matchingRule?.forwardUrl) {
          window.location.assign(matchingRule.forwardUrl);
        }
      } catch (e) {
        console.error(e);
        const msg = "Something went wrong. Please try again.";
        setError(msg);
        toast({
          title: "Submission failed",
          description: msg,
          variant: "destructive",
        });
      }
    });
  });

  if (!schema?.fields?.length) {
    return null;
  }

  const sortedFields = [...schema.fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  function isFieldVisible(field: (typeof sortedFields)[number]): boolean {
    const rule = field.visibility;
    if (!rule) return true;
    const raw = watchedValues?.[rule.whenFieldId];
    if (Array.isArray(raw)) {
      return raw.map(String).includes(String(rule.equals));
    }
    return String(raw ?? "") === String(rule.equals);
  }

  const visibleFields = sortedFields.filter(isFieldVisible);

  const formInlineStyle = textSize ? { fontSize: textSize } : undefined;
  const buttonStyle = ctaBgColor ? { backgroundColor: ctaBgColor } : undefined;
  const isQuestionnaire = formStyle === "questionnaire";
  const isDetailedPerspective = formStyle === "detailed-perspective";
  const buttonClass = isDetailedPerspective && !ctaBgColor
    ? "inline-flex w-full items-center justify-center rounded-md bg-amber-800 px-4 py-2.5 text-sm font-medium text-amber-50 shadow-md hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 font-serif"
    : isQuestionnaire && !ctaBgColor
    ? "inline-flex w-full items-center justify-center rounded-md bg-amber-800 px-4 py-2.5 text-sm font-medium text-amber-50 shadow-md hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 font-serif"
    : "inline-flex w-full items-center justify-center bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      {loadRecaptcha && <RecaptchaScript />}
      <form
        onSubmit={onSubmit}
        className={`${isDetailedPerspective ? "space-y-3" : "space-y-3"} text-sm ${isQuestionnaire || isDetailedPerspective ? "font-serif" : ""}`}
        style={formInlineStyle}
      >
        {/* Honeypot field for bots */}
        <input
          type="text"
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />

        {visibleFields.map((field, index) => (
          <FormField
            key={`${field.id}-${index}`}
            field={field}
            register={register}
            errors={errors}
            formStyle={formStyle}
          />
        ))}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type={onNextStep && skipValidationForNextStep ? "button" : "submit"}
          disabled={isPending}
          className={buttonClass}
          style={buttonStyle}
          onClick={
            onNextStep && skipValidationForNextStep ? handleNextClick : undefined
          }
        >
          {isPending ? (
            "Submitting..."
          ) : (
            <span
              className="cta-text"
              dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(ctaText) }}
            />
          )}
        </button>
        {helperText && (
          <p
            className={`${isDetailedPerspective ? "mt-2 text-md" : "mt-2 text-md"} text-zinc-600 font-serif text-center leading-relaxed`}
            dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(helperText) }}
          />
        )}
        {postCtaText && (
          <div
            className="text-sm text-zinc-700 font-serif leading-relaxed"
            dangerouslySetInnerHTML={{ __html: wrapLegalSignsHtml(postCtaText) }}
          />
        )}
      </form>
    </>
  );
}

