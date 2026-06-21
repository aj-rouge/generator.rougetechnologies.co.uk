// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface ProductUnlinkedRow {
  id: string;
  sku: string | null;
  title: string;
}

interface CountRow {
  total: number;
}

export async function GET(request: NextRequest) {
  // Fetch the D1 binding
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  const searchParams = request.nextUrl.searchParams;
  const missingShopifyId = searchParams.get("missingShopifyId") === "true";

  let limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  limit = Math.min(limit, 500);

  if (missingShopifyId) {
    try {
      const products = (await executeQuery(
        `SELECT id, sku, title FROM products 
         WHERE (shopify_id IS NULL OR shopify_id = '') 
         ORDER BY updated_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset],
        db, // <-- pass db
      )) as ProductUnlinkedRow[];

      const countResult = (await executeQuery(
        `SELECT COUNT(*) as total FROM products 
         WHERE (shopify_id IS NULL OR shopify_id = '')`,
        [],
        db, // <-- pass db
      )) as CountRow[];

      const total = countResult[0]?.total || 0;

      return NextResponse.json({
        products: products || [],
        total,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error("[Products Audit Feed Error]:", error);
      return NextResponse.json(
        {
          error:
            error.message || "Failed to retrieve tracking collection mapping",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Method parameter configuration not implemented" },
    { status: 400 },
  );
}
