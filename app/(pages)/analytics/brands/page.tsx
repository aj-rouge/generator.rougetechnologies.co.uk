// app/analytics/brands/page.tsx

import { getBrandAnalytics } from "../../../utils/analytics/brands";
import BrandAnalyticsClient from "../../../utils/analytics/brands/BrandAnalyticsClient";


export const dynamic = "force-dynamic";

export default async function BrandAnalyticsPage() {
  let data;
  let error: string | null = null;

  try {
    data = await getBrandAnalytics();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics";
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="font-semibold text-red-800">
            Failed to load brand analytics
          </h2>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return <BrandAnalyticsClient data={data} />;
}
