import { NextRequest, NextResponse } from "next/server";
import { batchUpdateBaselinkerDescriptions } from "../../actions/updateBaselinkerDescriptions";

export async function POST(request: NextRequest) {
  try {
    let productIds: (string | number)[] = [];
    try {
      // FIX: Explicitly cast as an any wrapper to read unknown properties cleanly
      const body = (await request.json()) as any;
      if (body && body.productIds && Array.isArray(body.productIds)) {
        productIds = body.productIds;
      }
    } catch {
      // Fail silently if request body text cannot be decoded properly
    }

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
