// app/api/shopify-sync-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { batchUpdateProductDescriptions } from "../../actions/updateShopifyDescriptions";

// 1. TYPE DEFINITIONS: Explicitly map the optional request body parameters
interface SyncAllRequestBody {
  productIds?: (string | number)[];
}

export async function POST(request: NextRequest) {
  try {
    let productIds: (string | number)[] = [];

    try {
      // 2. FIXED CAST: Typecast incoming parsed JSON data safely
      const body = (await request.json()) as SyncAllRequestBody;
      if (body && body.productIds && Array.isArray(body.productIds)) {
        productIds = body.productIds;
      }
    } catch {
      // no body provided or malformed JSON payload – gracefully fall back to sync all
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
