import { getDb, requireStaff } from "../../../utils/auth";
import {
  getEmployeeSummaries,
  getDailyActivity,
  getMostEditedProducts,
  startOfMonth,
  endOfMonth,
  daysAgo,
  startOfDay,
} from "../../../utils/d1/analytics";
import BarChart from "./BarChart";
import EmployeeCard from "./EmployeeCard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

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
  // Default: this calendar month
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

  const [summaries, daily, topProducts] = await Promise.all([
    getEmployeeSummaries(db, range),
    getDailyActivity(db, range),
    getMostEditedProducts(db, range, 10),
  ]);

  const totalActions = summaries.reduce((s, r) => s + r.total_actions, 0);
  const totalCreated = summaries.reduce((s, r) => s + r.products_created, 0);
  const totalEdited = summaries.reduce((s, r) => s + r.products_edited, 0);
  const totalDeleted = summaries.reduce((s, r) => s + r.products_deleted, 0);
  const activeUsers = summaries.length;

  const fromLabel = new Date(range.from).toLocaleDateString();
  const toLabel = new Date(range.to - 1).toLocaleDateString();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {fromLabel} → {toLabel} · {activeUsers} active{" "}
            {activeUsers === 1 ? "person" : "people"}
          </p>
        </div>
        <RangeFilter from={sp.from} to={sp.to} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total actions" value={totalActions} />
        <KpiCard label="Products created" value={totalCreated} tone="green" />
        <KpiCard label="Products edited" value={totalEdited} tone="blue" />
        <KpiCard label="Products deleted" value={totalDeleted} tone="red" />
      </div>

      {/* Daily activity chart */}
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

      {/* Employee cards */}
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

      {/* Most-edited products */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Most-edited products</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
            <tr>
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium text-right">Edits</th>
              <th className="px-6 py-3 font-medium text-right">Last edit</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => (
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
                <td className="px-6 py-3 text-right tabular-nums">{p.edits}</td>
                <td className="px-6 py-3 text-right text-gray-500">
                  {new Date(p.last_edited_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No products edited in this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: number;
  tone?: "gray" | "green" | "blue" | "red";
}) {
  const colors = {
    gray: "text-gray-900 dark:text-white",
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
      <div className="text-xs uppercase text-gray-500 tracking-wide">
        {label}
      </div>
      <div className={`text-3xl font-semibold mt-2 ${colors[tone]}`}>
        {value}
      </div>
    </div>
  );
}

function RangeFilter({ from, to }: { from?: string; to?: string }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const link = (f: string, t: string) => `/admin/analytics?from=${f}&to=${t}`;

  return (
    <div className="flex items-center gap-2 text-xs">
      <a
        href={link(weekAgo, today)}
        className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        Last 7 days
      </a>
      <a
        href={link(monthAgo, today)}
        className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        Last 30 days
      </a>
      <a
        href={link(monthStart, today)}
        className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        This month
      </a>
    </div>
  );
}
