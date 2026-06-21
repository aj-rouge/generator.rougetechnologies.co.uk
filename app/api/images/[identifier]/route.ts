// app/api/images/[identifier]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface ImageJoinRow {
  url: string | null;
  s3_path: string | null;
  alt_text: string | null;
  image_order: number | null;
  product_id: string;
  product_title: string;
}

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Access-Control-Allow-Origin",
    "https://www.rougetechnologies.co.uk",
  );
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  const { identifier } = await params;

  try {
    if (!identifier) {
      const response = NextResponse.json(
        { error: "Identifier is required" },
        { status: 400 },
      );
      return addCorsHeaders(response);
    }

    const numericShopifyId = identifier.includes("gid://")
      ? identifier.split("/").pop()!
      : identifier;

    console.log("🔍 Looking up images for identifier:", identifier);

    const query = `
      SELECT 
        pi.url,
        pi.s3_path,
        pi.alt_text,
        pi.image_order,
        p.id as product_id,
        p.title as product_title
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = ? 
         OR p.shopify_id = ?
         OR p.sku = ?
         OR p.ean = ?
         OR p.asin = ?
         OR p.baselinker_id = ?
      ORDER BY 
        CASE 
          WHEN p.id = ? OR p.shopify_id = ? THEN 1
          ELSE 2
        END,
        pi.image_order ASC
    `;

    const queryParams = [
      identifier,
      numericShopifyId,
      identifier,
      identifier,
      identifier,
      identifier,
      identifier,
      numericShopifyId,
    ];

    // 2. Pass db as third argument
    const results = (await executeQuery(
      query,
      queryParams,
      db,
    )) as ImageJoinRow[];

    if (!results || results.length === 0) {
      console.log("❌ Product not found for identifier:", identifier);
      const response = NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
      return addCorsHeaders(response);
    }

    const productInfo = {
      id: results[0].product_id,
      title: results[0].product_title,
    };

    console.log("✅ Product found:", productInfo.id, productInfo.title);

    const imageUrls = results
      .filter((row) => row.s3_path || row.url)
      .map((row) => row.s3_path || row.url);

    console.log(
      `📸 Found ${imageUrls.length} images for product ${productInfo.id}`,
    );

    const response = NextResponse.json(imageUrls, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json",
      },
    });

    return addCorsHeaders(response);
  } catch (error: any) {
    console.error("❌ Error fetching product images:", error);
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    return addCorsHeaders(response);
  }
}
