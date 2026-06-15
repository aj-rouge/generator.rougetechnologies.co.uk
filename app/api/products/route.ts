import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute/executeQuery";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const missingShopifyId = searchParams.get("missingShopifyId") === "true";
  let limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  limit = Math.min(limit, 500); // max 500 per request

  if (missingShopifyId) {
    const products = await executeQuery(
      `SELECT id, sku, title FROM products 
       WHERE (shopify_id IS NULL OR shopify_id = '') 
       ORDER BY updated_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    // Also get total count for pagination
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM products 
       WHERE (shopify_id IS NULL OR shopify_id = '')`,
    );
    const total = countResult[0]?.total || 0;

    return NextResponse.json({ products, total, limit, offset });
  }

  return NextResponse.json({ error: "Not implemented" }, { status: 400 });
}
