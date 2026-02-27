"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MoreHorizontal, Eye, Pencil, Copy } from "lucide-react";
import { DeletePageButton } from "@/components/admin/DeletePageButton";

interface PageRowActionsProps {
  pageId: string;
  slug: string;
  isMaster: boolean;
}

export function PageRowActions({ pageId, slug, isMaster }: PageRowActionsProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
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
            <form
              action="/api/admin/pages/duplicate"
              method="post"
              className="w-full"
            >
              <input type="hidden" name="pageId" value={pageId} />
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-50"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Duplicate</span>
              </button>
            </form>
            <div className="mt-1 border-t border-zinc-100 pt-1">
              <DeletePageButton pageId={pageId} slug={slug} variant="menu" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

