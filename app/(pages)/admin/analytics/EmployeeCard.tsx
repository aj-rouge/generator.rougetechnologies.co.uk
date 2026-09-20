import type { EmployeeSummary } from "../../../utils/d1/analytics";
import Link from "next/link";

export default function EmployeeCard({
  summary,
}: {
  summary: EmployeeSummary;
}) {
  const initials = summary.user_name
    .split(/[\s._-]+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-sm font-medium">
          {initials}
        </div>
        <div>
          <div className="font-medium">{summary.user_name}</div>
          <div className="text-xs text-gray-500">{summary.user_email}</div>
        </div>
        <Link
          href={`/admin/activity?userId=${summary.user_id}`}
          className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View feed →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Created" value={summary.products_created} />
        <Stat label="Edited" value={summary.products_edited} />
        <Stat label="Products" value={summary.distinct_products} />
      </div>
      <div className="mt-3 text-xs text-gray-500">
        Last action {new Date(summary.last_action_at).toLocaleString()}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
