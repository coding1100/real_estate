"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
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
  bookmarked?: boolean;
}

interface PagesTableProps {
  pages: PageListItem[];
}

export function PagesTable({ pages }: PagesTableProps) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<PageListItem[]>(pages);
  const [starredFirst, setStarredFirst] = useState(false);

  useEffect(() => {
    setRows(pages);
  }, [pages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? rows
      : rows.filter((p) => {
          const title = p.title || p.headline || "";
          return (
            p.slug.toLowerCase().includes(q) ||
            p.domainHostname.toLowerCase().includes(q) ||
            title.toLowerCase().includes(q)
          );
        });

    if (!starredFirst) return base;

    // Optional pinning: keep stable order within groups to avoid "wrong row" confusion.
    const starred: PageListItem[] = [];
    const normal: PageListItem[] = [];
    for (const p of base) {
      if (p.bookmarked) starred.push(p);
      else normal.push(p);
    }
    return [...starred, ...normal];
  }, [rows, query, starredFirst]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, PageListItem[]>();
    for (const p of filtered) {
      const key = p.domainHostname;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(p);
    }
    // keep groups ordered alphabetically by domain for predictability
    order.sort((a, b) => a.localeCompare(b));
    return { order, map };
  }, [filtered]);

  async function toggleBookmark(pageId: string, next: boolean) {
    setRows((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, bookmarked: next } : p)),
    );
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked: next }),
      });
      if (!res.ok) {
        setRows((prev) =>
          prev.map((p) =>
            p.id === pageId ? { ...p, bookmarked: !next } : p,
          ),
        );
      }
    } catch {
      setRows((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, bookmarked: !next } : p)),
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          {rows.length} page{rows.length === 1 ? "" : "s"} total.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={starredFirst}
              onChange={(e) => setStarredFirst(e.target.checked)}
            />
            <span>Starred first</span>
          </label>
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
      </div>

      <div className="max-[768px]:overflow-x-auto max-[768px]:-mx-2">
        <table className="min-w-full rounded-lg bg-white text-md shadow-sm max-[768px]:min-w-[600px]">
          <thead className="bg-zinc-50 text-[16px] uppercase tracking-[0.15em] text-zinc-500">
            <tr>
              <th className="px-2 py-2 text-left w-[44px]"></th>
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
            {grouped.order.map((domain) => {
              const pagesForDomain = grouped.map.get(domain) ?? [];
              if (pagesForDomain.length === 0) return null;
              return (
                <>
                  <tr key={`group-${domain}`} className="border-t border-zinc-200 bg-zinc-50/60">
                    <td className="px-3 py-2 text-sm font-semibold text-zinc-800" colSpan={9}>
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`https://${domain}`}
                          target="_blank"
                          className="hover:underline"
                        >
                          {domain}
                        </Link>
                        <span className="text-xs font-medium text-zinc-500">
                          {pagesForDomain.length} page{pagesForDomain.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {pagesForDomain.map((page) => {
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
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => toggleBookmark(page.id, !page.bookmarked)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100"
                            title={page.bookmarked ? "Unstar" : "Star"}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                page.bookmarked
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-zinc-400"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-3 text-zinc-700">
                          <span className="text-zinc-500">{domain}</span>
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
                            {isMultistep &&
                              Array.isArray(page.multistepStepSlugs) &&
                              page.multistepStepSlugs.length > 0 && (
                                <ol className="mt-1 space-y-0.5 text-[11px] text-zinc-500">
                                  {page.multistepStepSlugs.map((slug, idx) => (
                                    <li
                                      key={slug + idx}
                                      className="truncate max-w-[220px] text-[14px]"
                                    >
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
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-3 py-4 text-center text-zinc-500"
                  colSpan={9}
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

