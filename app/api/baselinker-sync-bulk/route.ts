import { NextRequest, NextResponse } from "next/server";
import { batchUpdateBaselinkerDescriptions } from "../../actions/updateBaselinkerDescriptions";

export async function POST(request: NextRequest) {
  try {
    let productIds: (string | number)[] = [];
    try {
      const body = await request.json();
      if (body.productIds && Array.isArray(body.productIds)) {
        productIds = body.productIds;
      }
    } catch {}
    const result = await batchUpdateBaselinkerDescriptions(productIds, {
      delayMs: 500,
    });
    return NextResponse.json({
      success: result.success,
      message: result.message,
      successCount: result.stats.successful,
      failureCount: result.stats.failed,
      results: result.results,
    });
  } catch (error: any) {
    console.error("Bulk Baselinker sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
