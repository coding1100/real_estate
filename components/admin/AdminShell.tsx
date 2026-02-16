"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe2,
  FileText,
  Users,
  Webhook,
  Layers,
  Menu,
} from "lucide-react";

interface AdminShellProps {
  children: ReactNode;
  userEmail?: string | null;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/domains", label: "Domains", icon: Globe2 },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/templates", label: "Templates", icon: Layers },
];

export function AdminShell({ children, userEmail }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 md:h-9 md:w-9"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold tracking-tight text-zinc-900">
              Admin
            </div>
          </div>
          <div className="text-xs text-zinc-500">{userEmail}</div>
        </div>
      </header>

      <div className="mx-auto flex w-full gap-6 px-4 py-6">
        <aside
          className={`hidden rounded-md bg-white/80 p-2 shadow-sm ring-1 ring-zinc-100 backdrop-blur md:block transition-all duration-200 ${
            collapsed ? "w-12" : "w-56"
          }`}
        >
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" &&
                  pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-zinc-50 shadow-sm"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar */}
        <aside className="md:hidden">
          <div className="fixed inset-x-0 top-[56px] z-30">
            <div
              className={`mx-4 origin-top rounded-md bg-white/95 p-2 shadow-md ring-1 ring-zinc-200 transition-all duration-200 ${
                collapsed ? "scale-y-0 opacity-0 pointer-events-none" : "scale-y-100 opacity-100"
              }`}
            >
              <nav className="space-y-1 text-sm">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" &&
                      pathname.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-zinc-900 text-zinc-50 shadow-sm"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

