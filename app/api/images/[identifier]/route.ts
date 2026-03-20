import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../../utils/d1/execute/executeQuery";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  const { identifier } = await params;

  try {
    if (!identifier) {
      return NextResponse.json(
        { error: "Identifier is required" },
        { status: 400 },
      );
    }

    console.log(
      "🔍 Looking up images for identifier:",
      "gid://shopify/Product/" + identifier,
    );

    // Single query to get all images with product lookup
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

    // Prepare parameters for all possible identifier fields
    const params = [
      identifier, // id
      "gid://shopify/Product/" + identifier, // shopify_id
      identifier, // sku
      identifier, // ean
      identifier, // asin
      identifier, // baselinker_id
      identifier, // id for CASE
      identifier, // shopify_id for CASE
    ];

    const results = await executeQuery(query, params);

    if (!results || results.length === 0) {
      console.log("❌ Product not found for identifier:", identifier);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Extract product info from first row
    const productInfo = {
      id: results[0].product_id,
      title: results[0].product_title,
    };

    console.log("✅ Product found:", productInfo.id, productInfo.title);

    // Filter out null images (in case product exists but has no images)
    const imageUrls = results
      .filter((row: any) => row.url || row.s3_path)
      .map((row: any) => row.s3_path || row.url);

    console.log(
      `📸 Found ${imageUrls.length} images for product ${productInfo.id}`,
    );
    if (imageUrls.length > 0) {
      imageUrls.slice(0, 3).forEach((url, i) => {
        console.log(`  Image ${i + 1}:`, url);
      });
      if (imageUrls.length > 3) {
        console.log(`  ... and ${imageUrls.length - 3} more`);
      }
    }

    // Add cache headers
    const headers = new Headers({
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json",
    });

    return NextResponse.json(imageUrls, { headers });
  } catch (error) {
    console.error("❌ Error fetching product images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
