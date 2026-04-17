import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/use-toast";
import { getAdminUiSettings } from "@/lib/uiSettings";

export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { theme } = await getAdminUiSettings();
  const frontendToastTheme = {
    ...theme,
    position: theme.position,
    durationMs: theme.durationMs,
  };

  return <ToastProvider theme={frontendToastTheme}>{children}</ToastProvider>;
}

