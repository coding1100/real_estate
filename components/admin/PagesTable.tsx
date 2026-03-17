"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SlugEditor } from "@/components/admin/SlugEditor";
import { TitleEditor } from "@/components/admin/TitleEditor";
import { PageRowActions } from "@/components/admin/PageRowActions";

export interface PageListItem {
  id: string;
  slug: string;
  type: string;
  status: string;
  updatedAt: string;
  headline: string | null;
  title: string | null;
  domainHostname: string;
  domainId: string;
  multistepStepSlugs: string[] | null;
}

interface PagesTableProps {
  pages: PageListItem[];
}

export function PagesTable({ pages }: PagesTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => {
      const title = p.title || p.headline || "";
      return (
        p.slug.toLowerCase().includes(q) ||
        p.domainHostname.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q)
      );
    });
  }, [pages, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          {pages.length} page{pages.length === 1 ? "" : "s"} total.
        </p>
        <div className="w-full sm:w-80">
          <label className="sr-only" htmlFor="pages-search">
            Search pages
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="pages-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by domain, slug, or title…"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 pr-9 py-1.5 text-sm text-zinc-800 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>
      </div>

      <div className="max-[768px]:overflow-x-auto max-[768px]:-mx-2">
        <table className="min-w-full rounded-lg bg-white text-md shadow-sm max-[768px]:min-w-[600px]">
          <thead className="bg-zinc-50 text-[16px] uppercase tracking-[0.15em] text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Domain</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Mode</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Updated</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((page) => {
              const isMaster =
                page.slug === "master-seller" || page.slug === "master-buyer";
              const isMultistep =
                Array.isArray(page.multistepStepSlugs) &&
                page.multistepStepSlugs.length > 0;

              return (
                <tr
                  key={page.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/80 transition-colors"
                >
                  <td className="px-3 py-3 text-zinc-700">
                    <Link
                      href={`https://${page.domainHostname}`}
                      target="_blank"
                      className="hover:underline"
                    >
                      {page.domainHostname}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-zinc-700">
                    {isMaster ? (
                      <span className="truncate">{page.slug}</span>
                    ) : (
                      <SlugEditor pageId={page.id} initialSlug={page.slug} />
                    )}
                  </td>
                  <td className="px-3 py-3 text-zinc-700 max-w-[260px]">
                    {isMaster ? (
                      <span className="truncate">
                        {page.title || page.headline || ""}
                      </span>
                    ) : (
                      <TitleEditor
                        pageId={page.id}
                        initialTitle={page.title || page.headline || ""}
                      />
                    )}
                  </td>
                  <td className="px-3 py-3 text-zinc-700">
                    <span className="capitalize">{page.type}</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-700 align-top">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isMultistep
                            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                            : "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200"
                        }`}
                      >
                        {isMultistep ? "Multistep" : "Single"}
                      </span>
                      {isMultistep && Array.isArray(page.multistepStepSlugs) && page.multistepStepSlugs.length > 0 && (
                        <ol className="mt-1 space-y-0.5 text-[11px] text-zinc-500">
                          {page.multistepStepSlugs.map((slug, idx) => (
                            <li key={slug + idx} className="truncate max-w-[220px] text-[14px]">
                              <span className="text-zinc-400">{idx + 1}.</span>{" "}
                              <span className="font-mono">{slug}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-700">{page.status}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(page.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <PageRowActions
                      pageId={page.id}
                      slug={page.slug}
                      isMaster={isMaster}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-3 py-4 text-center text-zinc-500"
                  colSpan={8}
                >
                  No pages match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

