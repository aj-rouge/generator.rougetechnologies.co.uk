import { ArrowRight } from "lucide-react";
import ProductsTable from "../../../components/admin/analytics/ProductsTable";

import { getDb, requireStaff } from "../../../utils/auth";
import {
  getEmployeeSummaries,
  getDailyActivity,
  getProductsForAnalytics,
  countProductsForAnalytics,
  startOfMonth,
  endOfMonth,
} from "../../../utils/d1/analytics";
import BarChart from "./BarChart";
import EmployeeCard from "./EmployeeCard";
import RangeFilter from "./RangeFilter";
import FadeIn from "../../../components/admin/analytics/FadeIn";
import KpiCard from "../../../components/admin/analytics/KpiCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type SearchParams = Promise<{
  from?: string;
  to?: string;
  view?: string;
  sort?: string;
  page?: string;
}>;

function parseRange(searchParams: { from?: string; to?: string }) {
  const now = new Date();
  if (searchParams.from || searchParams.to) {
    const from = searchParams.from
      ? new Date(searchParams.from).getTime()
      : startOfMonth(now);
    const to = searchParams.to
      ? new Date(new Date(searchParams.to).getTime() + 86400_000).getTime()
      : endOfMonth(now);
    return { from, to };
  }
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaff("/admin/analytics");
  const db = await getDb();
  const sp = await searchParams;
  const range = parseRange(sp);

  const initialView: "created" | "edits" =
    sp.view === "edits" ? "edits" : "created";
  const initialSort: "asc" | "desc" = sp.sort === "asc" ? "asc" : "desc";
  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [summaries, daily, productTotal] = await Promise.all([
    getEmployeeSummaries(db, range),
    getDailyActivity(db, range),
    countProductsForAnalytics(db, range, { view: initialView }),
  ]);

  const totalPages = Math.max(1, Math.ceil(productTotal / PAGE_SIZE));
  const initialPage = Math.min(requestedPage, totalPages);

  const productRows = await getProductsForAnalytics(db, range, {
    view: initialView,
    sortDir: initialSort,
    limit: PAGE_SIZE,
    offset: (initialPage - 1) * PAGE_SIZE,
  });

  const totalActions = summaries.reduce((s, r) => s + r.total_actions, 0);
  const totalCreated = summaries.reduce((s, r) => s + r.products_created, 0);
  const totalEdited = summaries.reduce((s, r) => s + r.products_edited, 0);
  const totalDeleted = summaries.reduce((s, r) => s + r.products_deleted, 0);
  const activeUsers = summaries.length;

  const fromLabel = new Date(range.from).toLocaleDateString();
  const toLabel = new Date(range.to - 1).toLocaleDateString();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <FadeIn>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1 inline-flex items-center gap-1.5 flex-wrap">
              <span>{fromLabel}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{toLabel}</span>
              <span className="text-gray-400">·</span>
              <span>
                {activeUsers} active {activeUsers === 1 ? "person" : "people"}
              </span>
            </p>
          </div>
          <RangeFilter
            from={sp.from}
            to={sp.to}
            view={sp.view}
            sort={sp.sort}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total actions" value={totalActions} />
          <KpiCard label="Products created" value={totalCreated} tone="green" />
          <KpiCard label="Products edited" value={totalEdited} tone="blue" />
          <KpiCard label="Products deleted" value={totalDeleted} tone="red" />
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Daily activity</h2>
          <BarChart
            data={daily}
            range={range}
            keys={summaries.map((s) => ({
              id: s.user_id,
              label: s.user_name,
            }))}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div>
          <h2 className="text-lg font-semibold mb-4">By employee</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map((s) => (
              <EmployeeCard key={s.user_id} summary={s} />
            ))}
            {summaries.length === 0 && (
              <div className="col-span-full text-center text-sm text-gray-500 py-12">
                No activity in this period
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <ProductsTable
          initialRows={productRows}
          initialTotal={productTotal}
          initialView={initialView}
          initialSort={initialSort}
          initialPage={initialPage}
          from={sp.from}
          to={sp.to}
        />
      </FadeIn>
    </div>
  );
}
