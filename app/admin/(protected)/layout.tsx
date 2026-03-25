import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminUiSettings } from "@/lib/uiSettings";

export const metadata: Metadata = {
  title: "Admin - Real Estate",
  icons: {
    icon: [{ url: "/favicon.png" }],
  },
};

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/admin/login");
  }

  const { theme } = await getAdminUiSettings();

  return (
    <AdminShell userEmail={session.user?.email} toastTheme={theme}>
      {children}
    </AdminShell>
  );
}

