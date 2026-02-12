import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold tracking-tight text-zinc-900">
            Admin
          </div>
          <div className="text-xs text-zinc-500">
            {session.user?.email}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <nav className="w-48 space-y-2 text-sm">
          <a href="/admin" className="block rounded px-2 py-1 hover:bg-zinc-100">
            Dashboard
          </a>
          <a
            href="/admin/domains"
            className="block rounded px-2 py-1 hover:bg-zinc-100"
          >
            Domains
          </a>
          <a
            href="/admin/pages"
            className="block rounded px-2 py-1 hover:bg-zinc-100"
          >
            Pages
          </a>
          <a
            href="/admin/leads"
            className="block rounded px-2 py-1 hover:bg-zinc-100"
          >
            Leads
          </a>
          <a
            href="/admin/webhooks"
            className="block rounded px-2 py-1 hover:bg-zinc-100"
          >
            Webhooks
          </a>
          <a
            href="/admin/templates"
            className="block rounded px-2 py-1 hover:bg-zinc-100"
          >
            Templates
          </a>
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

