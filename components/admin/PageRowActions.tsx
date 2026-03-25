"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, Copy, Link as LinkIcon } from "lucide-react";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import { useAdminToast } from "@/components/admin/useAdminToast";

interface PageRowActionsProps {
  pageId: string;
  slug: string;
  isMaster: boolean;
}

export function PageRowActions({ pageId, slug, isMaster }: PageRowActionsProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success, error } = useAdminToast();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        (target as Element).closest?.("[role=\"dialog\"]")
      ) {
        return;
      }
      if (
        menuRef.current &&
        target instanceof Node &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-flex items-center justify-end">
      {isMaster && (
        <span className="mr-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
          Master template
        </span>
      )}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-lg">
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-50"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View page</span>
            </a>
            <Link
              href={`/admin/pages/${pageId}/edit`}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Link>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const res = await fetch("/api/admin/pages/duplicate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pageId }),
                    });
                    const data = await res.json().catch(() => null);
                    if (!res.ok) {
                      const msg =
                        (data && typeof data.error === "string" && data.error) ||
                        "Failed to duplicate page.";
                      error(msg);
                      return;
                    }
                    setOpen(false);
                    router.refresh();
                    success("Page duplicated successfully.");
                  } catch (err) {
                    console.error(err);
                    error("Failed to duplicate page.");
                  }
                });
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={async () => {
                try {
                  const origin =
                    typeof window !== "undefined" ? window.location.origin : "";
                  const url = `${origin}/${slug}`.replace(/\/+/g, "/");

                  if (
                    typeof navigator !== "undefined" &&
                    navigator.clipboard?.writeText
                  ) {
                    await navigator.clipboard.writeText(url);
                  } else {
                    const temp = document.createElement("textarea");
                    temp.value = url;
                    temp.style.position = "fixed";
                    temp.style.left = "-9999px";
                    temp.style.top = "-9999px";
                    document.body.appendChild(temp);
                    temp.focus();
                    temp.select();
                    document.execCommand("copy");
                    document.body.removeChild(temp);
                  }

                  setOpen(false);
                  success("Link copied to clipboard.");
                } catch {
                  error("Failed to copy link.");
                }
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Copy link</span>
            </button>
            <div className="mt-1 border-t border-zinc-100 pt-1">
              <DeletePageButton pageId={pageId} slug={slug} variant="menu" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

