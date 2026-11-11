// app/(pages)/analytics/specifications/page.tsx

import { getSpecificationsAnalytics } from "../../../utils/analytics/specifications";
import SpecificationsAnalyticsClient from "../../../utils/analytics/specifications/SpecificationsAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function SpecificationsAnalyticsPage() {
  let data;
  let error: string | null = null;

  try {
    data = await getSpecificationsAnalytics();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics";
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-4">
          <h2 className="font-semibold text-red-800 dark:text-red-200">
            Failed to load specifications analytics
          </h2>
          <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return <SpecificationsAnalyticsClient data={data} />;
}
