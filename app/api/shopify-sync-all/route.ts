// app/api/shopify-sync-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { batchUpdateProductDescriptions } from "../../actions/updateShopifyDescriptions";

export async function POST(request: NextRequest) {
  try {
    let productIds: (string | number)[] = [];
    try {
      const body = await request.json();
      if (body.productIds && Array.isArray(body.productIds)) {
        productIds = body.productIds;
      }
    } catch {
      // no body – sync all
    }

    const result = await batchUpdateProductDescriptions(productIds, {
      delayMs: 500,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      successCount: result.stats.successful,
      failureCount: result.stats.failed,
      results: result.results,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("Bulk sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
