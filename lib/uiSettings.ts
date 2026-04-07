import { prisma } from "@/lib/prisma";
import type { EditorFontOption } from "@/lib/editorFonts";
import { DEFAULT_EDITOR_FONTS } from "@/lib/editorFonts";
import {
  type CtaForwardingDocument,
  type CtaForwardingNotifyEmail,
  type CtaForwardingRule,
  sanitizeCtaTitle,
} from "@/lib/types/ctaForwarding";

const SINGLETON_ID = "singleton";

export interface ToastTheme {
  successBg: string;
  successText: string;
  errorBg: string;
  errorText: string;
  alertBg: string;
  alertText: string;
   infoBg: string;
   infoText: string;
  iconSize: number;
  successTitle: string;
  successBody: string;
  errorTitle: string;
  errorBody: string;
  alertTitle: string;
  alertBody: string;
}

export interface AdminUiSettings {
  id: string;
  toastSuccessBg: string;
  toastSuccessText: string;
  toastErrorBg: string;
  toastErrorText: string;
  toastAlertBg: string;
  toastAlertText: string;
  toastInfoBg: string;
  toastInfoText: string;
  toastIconSize: number;
  toastSuccessTitle: string;
  toastSuccessBody: string;
  toastErrorTitle: string;
  toastErrorBody: string;
  toastAlertTitle: string;
  toastAlertBody: string;
  editorFonts?: EditorFontOption[] | null;
  ctaForwardingRules?: CtaForwardingRule[] | null;
}

// Re-export from client-safe module so server code can still import from here
export type { EditorFontOption } from "@/lib/editorFonts";
export {
  DEFAULT_EDITOR_FONTS,
  BUILT_IN_EDITOR_FONT_LABELS,
  isBuiltInEditorFont,
  getEnabledEditorFonts,
} from "@/lib/editorFonts";

export const DEFAULT_THEME: ToastTheme = {
  successBg: "#ecfdf3",
  successText: "#166534",
  errorBg: "#fef2f2",
  errorText: "#b91c1c",
  alertBg: "#fffbeb",
  alertText: "#92400e",
  infoBg: "#eff6ff",
  infoText: "#1d4ed8",
  iconSize: 24,
  successTitle: "Success",
  successBody: "Action completed successfully.",
  errorTitle: "Something went wrong",
  errorBody: "Please try again.",
  alertTitle: "Attention",
  alertBody: "Please review this information.",
};

function normalizeCtaForwardingRules(
  input: unknown,
): CtaForwardingRule[] {
  if (!Array.isArray(input)) return [];
  const normalized: CtaForwardingRule[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const ctaTitle = sanitizeCtaTitle(
      typeof (item as any).ctaTitle === "string"
        ? (item as any).ctaTitle
        : "",
    );
    const forwardUrl =
      typeof (item as any).forwardUrl === "string"
        ? (item as any).forwardUrl.trim()
        : "";
    const forwardEnabled =
      typeof (item as any).forwardEnabled === "boolean"
        ? (item as any).forwardEnabled
        : !!forwardUrl;
    const resendTemplateId =
      typeof (item as any).resendTemplateId === "string"
        ? (item as any).resendTemplateId.trim()
        : "";
    const resendTemplateName =
      typeof (item as any).resendTemplateName === "string"
        ? (item as any).resendTemplateName.trim()
        : "";
    if (!ctaTitle) continue;
    if (forwardUrl && !/^https?:\/\//i.test(forwardUrl)) continue;

    const rawDocuments = Array.isArray((item as any).documents)
      ? ((item as any).documents as unknown[])
      : [];
    const documents: CtaForwardingDocument[] =
      rawDocuments
        .map((doc) => {
          if (!doc || typeof doc !== "object") return null;
          const name =
            typeof (doc as any).name === "string"
              ? (doc as any).name.trim()
              : "";
          const url =
            typeof (doc as any).url === "string"
              ? (doc as any).url.trim()
              : "";
          if (!name || !url || !/^https?:\/\//i.test(url)) return null;
          const autoSend =
            typeof (doc as any).autoSend === "boolean"
              ? (doc as any).autoSend
              : undefined;
          const mimeType =
            typeof (doc as any).mimeType === "string"
              ? (doc as any).mimeType.trim()
              : undefined;
          const publicId =
            typeof (doc as any).publicId === "string"
              ? (doc as any).publicId.trim()
              : "";
          const format =
            typeof (doc as any).format === "string"
              ? (doc as any).format.trim().toLowerCase()
              : "";
          return {
            name,
            url,
            ...(autoSend !== undefined ? { autoSend } : {}),
            ...(mimeType ? { mimeType } : {}),
            ...(publicId ? { publicId } : {}),
            ...(format ? { format } : {}),
          };
        })
        .filter(Boolean) as CtaForwardingDocument[];

    const rawNotifyEmails = Array.isArray((item as any).notifyEmails)
      ? ((item as any).notifyEmails as unknown[])
      : [];
    const notifyEmails: CtaForwardingNotifyEmail[] =
      rawNotifyEmails
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const email =
            typeof (entry as any).email === "string"
              ? (entry as any).email.trim()
              : "";
          if (!email || !email.includes("@")) return null;
          const enabledRaw =
            typeof (entry as any).enabled === "boolean"
              ? (entry as any).enabled
              : undefined;
          const kindRaw =
            typeof (entry as any).kind === "string"
              ? (entry as any).kind.trim().toLowerCase()
              : undefined;
          const kind: "cc" | "bcc" | undefined =
            kindRaw === "cc" || kindRaw === "bcc" ? (kindRaw as any) : undefined;
          return {
            email,
            ...(enabledRaw === undefined ? {} : { enabled: enabledRaw }),
            ...(kind ? { kind } : {}),
          };
        })
        .filter(Boolean) as CtaForwardingNotifyEmail[];

    normalized.push({
      ctaTitle,
      forwardEnabled,
      ...(forwardUrl ? { forwardUrl } : {}),
      ...(resendTemplateId ? { resendTemplateId } : {}),
      ...(resendTemplateName ? { resendTemplateName } : {}),
      ...(documents.length ? { documents } : {}),
      ...(notifyEmails.length ? { notifyEmails } : {}),
    });
  }
  return normalized;
}

async function ensureCtaForwardingColumn() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "AdminUiSettings" ADD COLUMN IF NOT EXISTS "ctaForwardingRules" JSONB',
  );
}

async function readCtaForwardingRules(): Promise<CtaForwardingRule[]> {
  try {
    await ensureCtaForwardingColumn();
    const rows = await prisma.$queryRawUnsafe<Array<{ ctaForwardingRules: unknown }>>(
      'SELECT "ctaForwardingRules" FROM "AdminUiSettings" WHERE "id" = $1 LIMIT 1',
      SINGLETON_ID,
    );
    return normalizeCtaForwardingRules(rows?.[0]?.ctaForwardingRules);
  } catch {
    return [];
  }
}

export async function getAdminUiSettings(): Promise<{
  settings: AdminUiSettings;
  theme: ToastTheme;
  editorFonts: EditorFontOption[];
}> {
  try {
    const settings = await prisma.adminUiSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: {
        id: SINGLETON_ID,
        toastSuccessBg: DEFAULT_THEME.successBg,
        toastSuccessText: DEFAULT_THEME.successText,
        toastErrorBg: DEFAULT_THEME.errorBg,
        toastErrorText: DEFAULT_THEME.errorText,
        toastAlertBg: DEFAULT_THEME.alertBg,
        toastAlertText: DEFAULT_THEME.alertText,
        toastInfoBg: DEFAULT_THEME.infoBg,
        toastInfoText: DEFAULT_THEME.infoText,
        toastIconSize: DEFAULT_THEME.iconSize,
        toastSuccessTitle: DEFAULT_THEME.successTitle,
        toastSuccessBody: DEFAULT_THEME.successBody,
        toastErrorTitle: DEFAULT_THEME.errorTitle,
        toastErrorBody: DEFAULT_THEME.errorBody,
        toastAlertTitle: DEFAULT_THEME.alertTitle,
        toastAlertBody: DEFAULT_THEME.alertBody,
        editorFonts: DEFAULT_EDITOR_FONTS as any,
      },
    });

    const theme: ToastTheme = {
      successBg: settings.toastSuccessBg || DEFAULT_THEME.successBg,
      successText: settings.toastSuccessText || DEFAULT_THEME.successText,
      errorBg: settings.toastErrorBg || DEFAULT_THEME.errorBg,
      errorText: settings.toastErrorText || DEFAULT_THEME.errorText,
      alertBg: settings.toastAlertBg || DEFAULT_THEME.alertBg,
      alertText: settings.toastAlertText || DEFAULT_THEME.alertText,
      infoBg: settings.toastInfoBg || DEFAULT_THEME.infoBg,
      infoText: settings.toastInfoText || DEFAULT_THEME.infoText,
      iconSize: settings.toastIconSize || DEFAULT_THEME.iconSize,
      successTitle:
        settings.toastSuccessTitle || DEFAULT_THEME.successTitle,
      successBody: settings.toastSuccessBody || DEFAULT_THEME.successBody,
      errorTitle: settings.toastErrorTitle || DEFAULT_THEME.errorTitle,
      errorBody: settings.toastErrorBody || DEFAULT_THEME.errorBody,
      alertTitle: settings.toastAlertTitle || DEFAULT_THEME.alertTitle,
      alertBody: settings.toastAlertBody || DEFAULT_THEME.alertBody,
    };

    const savedFonts = (settings.editorFonts as EditorFontOption[] | null) ?? [];
    const savedByLabel = new Map(
      savedFonts.map((f) => [
        f.label,
        { ...f, enabled: f.enabled !== false },
      ]),
    );
    const merged: EditorFontOption[] = DEFAULT_EDITOR_FONTS.map((d) => {
      const s = savedByLabel.get(d.label);
      if (s) {
        // Use any saved properties (like cssFamily and enabled),
        // but keep the default label as the key.
        savedByLabel.delete(d.label);
        return {
          ...d,
          ...s,
          enabled: s.enabled !== false,
        };
      }
      // Default fonts that were never customized are enabled by default.
      return { ...d, enabled: true };
    });
    // Any remaining saved fonts are purely custom (non-built-in) fonts.
    savedByLabel.forEach((f) => merged.push(f));
    const editorFonts = merged;

    const ctaForwardingRules = await readCtaForwardingRules();

    return {
      settings: { ...(settings as AdminUiSettings), ctaForwardingRules },
      theme,
      editorFonts,
    };
  } catch (err: any) {
    if (err?.code === "P2021" || /AdminUiSettings/.test(String(err?.message))) {
      const settings: AdminUiSettings = {
        id: SINGLETON_ID,
        toastSuccessBg: DEFAULT_THEME.successBg,
        toastSuccessText: DEFAULT_THEME.successText,
        toastErrorBg: DEFAULT_THEME.errorBg,
        toastErrorText: DEFAULT_THEME.errorText,
        toastAlertBg: DEFAULT_THEME.alertBg,
        toastAlertText: DEFAULT_THEME.alertText,
        toastInfoBg: DEFAULT_THEME.infoBg,
        toastInfoText: DEFAULT_THEME.infoText,
        toastIconSize: DEFAULT_THEME.iconSize,
        toastSuccessTitle: DEFAULT_THEME.successTitle,
        toastSuccessBody: DEFAULT_THEME.successBody,
        toastErrorTitle: DEFAULT_THEME.errorTitle,
        toastErrorBody: DEFAULT_THEME.errorBody,
        toastAlertTitle: DEFAULT_THEME.alertTitle,
        toastAlertBody: DEFAULT_THEME.alertBody,
        editorFonts: DEFAULT_EDITOR_FONTS as any,
        ctaForwardingRules: [],
      };
      return {
        settings,
        theme: DEFAULT_THEME,
        editorFonts: DEFAULT_EDITOR_FONTS.map((f) => ({ ...f, enabled: true })) as any,
      };
    }
    throw err;
  }
}

export async function updateAdminUiSettings(
  patch: Partial<Pick<
    AdminUiSettings,
    | "toastSuccessBg"
    | "toastSuccessText"
    | "toastErrorBg"
    | "toastErrorText"
    | "toastAlertBg"
    | "toastAlertText"
    | "toastInfoBg"
    | "toastInfoText"
    | "toastIconSize"
    | "toastSuccessTitle"
    | "toastSuccessBody"
    | "toastErrorTitle"
    | "toastErrorBody"
    | "toastAlertTitle"
    | "toastAlertBody"
    | "editorFonts"
    | "ctaForwardingRules"
  >>,
): Promise<{ settings: AdminUiSettings; theme: ToastTheme }> {
  try {
    const settings = await prisma.adminUiSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {
        ...(patch.toastSuccessBg != null && {
          toastSuccessBg: patch.toastSuccessBg,
        }),
        ...(patch.toastSuccessText != null && {
          toastSuccessText: patch.toastSuccessText,
        }),
        ...(patch.toastErrorBg != null && {
          toastErrorBg: patch.toastErrorBg,
        }),
        ...(patch.toastErrorText != null && {
          toastErrorText: patch.toastErrorText,
        }),
        ...(patch.toastAlertBg != null && {
          toastAlertBg: patch.toastAlertBg,
        }),
        ...(patch.toastAlertText != null && {
          toastAlertText: patch.toastAlertText,
        }),
        ...(patch.toastInfoBg != null && {
          toastInfoBg: patch.toastInfoBg,
        }),
        ...(patch.toastInfoText != null && {
          toastInfoText: patch.toastInfoText,
        }),
        ...(patch.toastIconSize != null && {
          toastIconSize: patch.toastIconSize,
        }),
        ...(patch.toastSuccessTitle != null && {
          toastSuccessTitle: patch.toastSuccessTitle,
        }),
        ...(patch.toastSuccessBody != null && {
          toastSuccessBody: patch.toastSuccessBody,
        }),
        ...(patch.toastErrorTitle != null && {
          toastErrorTitle: patch.toastErrorTitle,
        }),
        ...(patch.toastErrorBody != null && {
          toastErrorBody: patch.toastErrorBody,
        }),
        ...(patch.toastAlertTitle != null && {
          toastAlertTitle: patch.toastAlertTitle,
        }),
        ...(patch.toastAlertBody != null && {
          toastAlertBody: patch.toastAlertBody,
        }),
        ...(patch.editorFonts != null && {
          editorFonts: patch.editorFonts as any,
        }),
      },
      create: {
        id: SINGLETON_ID,
        toastSuccessBg: patch.toastSuccessBg ?? DEFAULT_THEME.successBg,
        toastSuccessText: patch.toastSuccessText ?? DEFAULT_THEME.successText,
        toastErrorBg: patch.toastErrorBg ?? DEFAULT_THEME.errorBg,
        toastErrorText: patch.toastErrorText ?? DEFAULT_THEME.errorText,
        toastAlertBg: patch.toastAlertBg ?? DEFAULT_THEME.alertBg,
        toastAlertText: patch.toastAlertText ?? DEFAULT_THEME.alertText,
        toastInfoBg: patch.toastInfoBg ?? DEFAULT_THEME.infoBg,
        toastInfoText: patch.toastInfoText ?? DEFAULT_THEME.infoText,
        toastIconSize: patch.toastIconSize ?? DEFAULT_THEME.iconSize,
        toastSuccessTitle:
          patch.toastSuccessTitle ?? DEFAULT_THEME.successTitle,
        toastSuccessBody:
          patch.toastSuccessBody ?? DEFAULT_THEME.successBody,
        toastErrorTitle:
          patch.toastErrorTitle ?? DEFAULT_THEME.errorTitle,
        toastErrorBody: patch.toastErrorBody ?? DEFAULT_THEME.errorBody,
        toastAlertTitle:
          patch.toastAlertTitle ?? DEFAULT_THEME.alertTitle,
        toastAlertBody: patch.toastAlertBody ?? DEFAULT_THEME.alertBody,
        editorFonts: (patch.editorFonts as any) ?? (DEFAULT_EDITOR_FONTS as any),
      },
    });

    if (patch.ctaForwardingRules != null) {
      await ensureCtaForwardingColumn();
      await prisma.$executeRawUnsafe(
        'UPDATE "AdminUiSettings" SET "ctaForwardingRules" = $1 WHERE "id" = $2',
        JSON.stringify(normalizeCtaForwardingRules(patch.ctaForwardingRules)),
        SINGLETON_ID,
      );
    }

    const theme: ToastTheme = {
      successBg: settings.toastSuccessBg || DEFAULT_THEME.successBg,
      successText: settings.toastSuccessText || DEFAULT_THEME.successText,
      errorBg: settings.toastErrorBg || DEFAULT_THEME.errorBg,
      errorText: settings.toastErrorText || DEFAULT_THEME.errorText,
      alertBg: settings.toastAlertBg || DEFAULT_THEME.alertBg,
      alertText: settings.toastAlertText || DEFAULT_THEME.alertText,
      infoBg: settings.toastInfoBg || DEFAULT_THEME.infoBg,
      infoText: settings.toastInfoText || DEFAULT_THEME.infoText,
      iconSize: settings.toastIconSize || DEFAULT_THEME.iconSize,
      successTitle:
        settings.toastSuccessTitle || DEFAULT_THEME.successTitle,
      successBody: settings.toastSuccessBody || DEFAULT_THEME.successBody,
      errorTitle: settings.toastErrorTitle || DEFAULT_THEME.errorTitle,
      errorBody: settings.toastErrorBody || DEFAULT_THEME.errorBody,
      alertTitle: settings.toastAlertTitle || DEFAULT_THEME.alertTitle,
      alertBody: settings.toastAlertBody || DEFAULT_THEME.alertBody,
    };

    const ctaForwardingRules = await readCtaForwardingRules();
    return {
      settings: { ...(settings as AdminUiSettings), ctaForwardingRules },
      theme,
    };
  } catch (err: any) {
    if (err?.code === "P2021" || /AdminUiSettings/.test(String(err?.message))) {
      const settings: AdminUiSettings = {
        id: SINGLETON_ID,
        toastSuccessBg: patch.toastSuccessBg ?? DEFAULT_THEME.successBg,
        toastSuccessText: patch.toastSuccessText ?? DEFAULT_THEME.successText,
        toastErrorBg: patch.toastErrorBg ?? DEFAULT_THEME.errorBg,
        toastErrorText: patch.toastErrorText ?? DEFAULT_THEME.errorText,
        toastAlertBg: patch.toastAlertBg ?? DEFAULT_THEME.alertBg,
        toastAlertText: patch.toastAlertText ?? DEFAULT_THEME.alertText,
        toastInfoBg: patch.toastInfoBg ?? DEFAULT_THEME.infoBg,
        toastInfoText: patch.toastInfoText ?? DEFAULT_THEME.infoText,
        toastIconSize: patch.toastIconSize ?? DEFAULT_THEME.iconSize,
        toastSuccessTitle:
          patch.toastSuccessTitle ?? DEFAULT_THEME.successTitle,
        toastSuccessBody:
          patch.toastSuccessBody ?? DEFAULT_THEME.successBody,
        toastErrorTitle:
          patch.toastErrorTitle ?? DEFAULT_THEME.errorTitle,
        toastErrorBody: patch.toastErrorBody ?? DEFAULT_THEME.errorBody,
        toastAlertTitle:
          patch.toastAlertTitle ?? DEFAULT_THEME.alertTitle,
        toastAlertBody: patch.toastAlertBody ?? DEFAULT_THEME.alertBody,
        ctaForwardingRules: normalizeCtaForwardingRules(
          patch.ctaForwardingRules,
        ),
      };
      return { settings, theme: DEFAULT_THEME };
    }
    throw err;
  }
}

