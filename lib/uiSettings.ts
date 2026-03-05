import { prisma } from "@/lib/prisma";

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
}

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

export async function getAdminUiSettings(): Promise<{
  settings: AdminUiSettings;
  theme: ToastTheme;
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

    return { settings, theme };
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
      };
      return { settings, theme: DEFAULT_THEME };
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

    return { settings, theme };
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
      };
      return { settings, theme: DEFAULT_THEME };
    }
    throw err;
  }
}

