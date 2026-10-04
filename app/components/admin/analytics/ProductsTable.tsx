"use client";

import { useState } from "react";
import type { ProductListRow } from "../../../utils/d1/analytics";

type View = "created" | "edits";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** 1 Oct 2026 14:23:45 */
function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm}:${ss}`;
}

export default function ProductsTable({
  initialRows,
  initialTotal,
  initialView,
  initialSort,
  initialPage,
  from,
  to,
}: {
  initialRows: ProductListRow[];
  initialTotal: number;
  initialView: View;
  initialSort: SortDir;
  initialPage: number;
  from?: string;
  to?: string;
}) {
  const [rows, setRows] = useState<ProductListRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [view, setView] = useState<View>(initialView);
  const [sort, setSort] = useState<SortDir>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function load(next: { view: View; sort: SortDir; page: number }) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: next.view,
        sort: next.sort,
        page: String(next.page),
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/admin/analytics/products?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as {
        rows: ProductListRow[];
        total: number;
        totalPages: number;
        page: number;
      };

      setRows(data.rows);
      setTotal(data.total);
      setView(next.view);
      setSort(next.sort);
      setPage(data.page);

      const url = new URL(window.location.href);
      if (next.view === "edits") url.searchParams.set("view", "edits");
      else url.searchParams.delete("view");
      if (next.sort === "asc") url.searchParams.set("sort", "asc");
      else url.searchParams.delete("sort");
      if (data.page > 1) url.searchParams.set("page", String(data.page));
      else url.searchParams.delete("page");
      window.history.replaceState(null, "", url.toString());
    } finally {
      setLoading(false);
    }
  }

  function pickView(v: View) {
    if (v === view) return;
    load({ view: v, sort, page: 1 });
  }

  function toggleSort(field: View) {
    const isActive = field === view;
    const newSort: SortDir = isActive && sort === "desc" ? "asc" : "desc";
    load({ view: field, sort: newSort, page: 1 });
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page || loading) return;
    load({ view, sort, page: p });
  }

  const disabled = loading ? "opacity-60 pointer-events-none" : "";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Header with view toggle */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">
          {view === "edits"
            ? "Most-edited products"
            : "Latest created products"}
        </h2>
        <div className={`flex items-center gap-1 text-xs ${disabled}`}>
          <button
            type="button"
            onClick={() => pickView("created")}
            className={
              view === "created"
                ? "px-3 py-1.5 rounded-full border border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                : "px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }
          >
            Latest created
          </button>
          <button
            type="button"
            onClick={() => pickView("edits")}
            className={
              view === "edits"
                ? "px-3 py-1.5 rounded-full border border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                : "px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }
          >
            Most edited
          </button>
        </div>
      </div>

      <table className={`w-full text-sm ${disabled}`}>
        <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
          <tr>
            <th className="px-6 py-3 font-medium">Product</th>
            <th className="px-6 py-3 font-medium">Created by</th>
            <th className="px-6 py-3 font-medium text-right">
              <button
                type="button"
                onClick={() => toggleSort("created")}
                className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Created
                <SortArrow active={view === "created"} dir={sort} />
              </button>
            </th>
            <th className="px-6 py-3 font-medium text-right">
              <button
                type="button"
                onClick={() => toggleSort("edits")}
                className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Edits
                <SortArrow active={view === "edits"} dir={sort} />
              </button>
            </th>
            <th className="px-6 py-3 font-medium text-right">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.product_id}
              className="border-t border-gray-100 dark:border-gray-800"
            >
              <td className="px-6 py-3">
                <a
                  href={`/products/${p.product_id}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {p.product_label || p.product_id}
                </a>
              </td>
              <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                {p.created_by ?? "—"}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-500 whitespace-nowrap">
                {p.created_at ? formatDateTime(p.created_at) : "—"}
              </td>
              <td className="px-6 py-3 text-right tabular-nums">{p.edits}</td>
              <td className="px-6 py-3 text-right text-gray-500 tabular-nums whitespace-nowrap">
                {formatDateTime(p.last_activity_at)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                {view === "created"
                  ? "No products created in this period"
                  : "No products edited in this period"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {total > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Page {page} of {totalPages} · {total}{" "}
            {total === 1 ? "product" : "products"}
          </span>
          <div className={`flex items-center gap-2 ${disabled}`}>
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return <span className="text-gray-400">{dir === "asc" ? "↑" : "↓"}</span>;
}
