// app/api/product/save/route.ts

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getProductById } from "../../../utils/d1/product/readProduct";
import {
  cleanupImagesFromR2,
  moveExistingToTemp,
  processImages,
} from "../../../utils/images/productImageService";
import { executeQuery } from "../../../utils/d1/execute/executeQuery";

// ----------------------------------------------------------------------
// Helper to format D1/SQLite errors into user‑friendly messages
// ----------------------------------------------------------------------
function formatDatabaseError(error: any): string {
  const message = error?.message || String(error);

  // Helper: convert "table.field" or just "field" into a user‑friendly label
  const toUserFriendlyField = (field: string): string => {
    // Remove table prefix if present (e.g., "products.sku" -> "sku")
    const base = field.includes(".") ? field.split(".").pop()! : field;

    // Common overrides (customize as needed)
    const overrides: Record<string, string> = {
      sku: "SKU",
      ean: "EAN",
      asin: "ASIN",
      slug: "Slug",
      baselinker_id: "Baselinker ID",
      shopify_id: "Shopify ID",
      group_key: "Group Key",
      option_value: "Option Value",
      category_slug: "Category Slug",
    };

    if (overrides[base]) return overrides[base];

    // Fallback: capitalise and replace underscores with spaces
    return base
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // 1. Extract from D1 API error array
  const d1Match = message.match(/D1 API error:\s*(\[.*\])/);
  if (d1Match) {
    try {
      const parsed = JSON.parse(d1Match[1]);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        const inner = parsed[0].message;
        const uniqueMatch = inner.match(/UNIQUE constraint failed:\s*(\S+)/i);
        if (uniqueMatch) {
          const field = toUserFriendlyField(uniqueMatch[1]);
          return `${field} already exists. Please use a different ${field.toLowerCase()}.`;
        }
        return inner.split(":")[0] || inner;
      }
    } catch (e) {
      // fall through
    }
  }

  // 2. Direct SQLite message
  const uniqueMatch = message.match(/UNIQUE constraint failed:\s*(\S+)/i);
  if (uniqueMatch) {
    const field = toUserFriendlyField(uniqueMatch[1]);
    return `${field} already exists. Please use a different ${field.toLowerCase()}.`;
  }

  // 3. Fallback
  return message.split("\n")[0].replace(/^Error:\s*/, "");
}

// ----------------------------------------------------------------------
// D1 Upsert Logic
// ----------------------------------------------------------------------

interface ProductData {
  id?: string;
  slug: string;
  title: string;
  sku?: string | null;
  ean?: string | null;
  asin?: string | null;
  baselinker_id?: string | null;
  shopify_id?: string | null;
  condition?: string | null;
  note?: string | null;
  category: string;
  paragraphs?: string[];
  features?: Array<{ title: string; description: string }>;
  images?: any[];
  feedbacks?: Array<{ name: string; content: string; count?: number }>;
  specifications?: Array<{ key: string; value: string }>; // 🆕 added
}

interface FinalizedImage {
  url: string;
  s3_path: string;
  alt_text: string;
}

/**
 * Upsert a product and all its related child records.
 * Child tables are cleared and re‑inserted with the new data.
 */
async function upsertProductData(
  productId: string,
  data: ProductData,
  finalizedImages: FinalizedImage[],
  isUpdate: boolean,
) {
  const now = Math.floor(Date.now() / 1000);

  // Upsert product
  const productQuery = `
    INSERT INTO products (
      id, slug, title, sku, ean, asin,
      baselinker_id, shopify_id, category,
      condition, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      sku = excluded.sku,
      ean = excluded.ean,
      asin = excluded.asin,
      baselinker_id = excluded.baselinker_id,
      shopify_id = excluded.shopify_id,
      category = excluded.category,
      condition = excluded.condition,
      note = excluded.note,
      updated_at = excluded.updated_at
  `;

  await executeQuery(productQuery, [
    productId,
    data.slug.split("/").pop()!,
    data.title,
    data.sku || null,
    data.ean || null,
    data.asin || null,
    data.baselinker_id || null,
    data.shopify_id || null,
    data.category,
    data.condition || null,
    data.note || null,
    isUpdate ? null : now,
    now,
  ]);

  // Replace paragraphs
  await executeQuery("DELETE FROM product_paragraphs WHERE product_id = ?", [
    productId,
  ]);
  if (data.paragraphs?.length) {
    for (let i = 0; i < data.paragraphs.length; i++) {
      await executeQuery(
        "INSERT INTO product_paragraphs (product_id, paragraph_order, content, created_at) VALUES (?, ?, ?, ?)",
        [productId, i + 1, data.paragraphs[i], now],
      );
    }
  }

  // Replace features
  await executeQuery("DELETE FROM product_features WHERE product_id = ?", [
    productId,
  ]);
  if (data.features?.length) {
    for (let i = 0; i < data.features.length; i++) {
      const f = data.features[i];
      await executeQuery(
        "INSERT INTO product_features (product_id, feature_order, title, description, created_at) VALUES (?, ?, ?, ?, ?)",
        [productId, i + 1, f.title, f.description, now],
      );
    }
  }

  // Replace specifications 🆕
  await executeQuery(
    "DELETE FROM product_specifications WHERE product_id = ?",
    [productId],
  );
  if (data.specifications?.length) {
    for (let i = 0; i < data.specifications.length; i++) {
      const spec = data.specifications[i];
      await executeQuery(
        `INSERT INTO product_specifications 
         (product_id, spec_order, key, value, created_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [productId, i + 1, spec.key, spec.value, now],
      );
    }
  }

  // Replace images (unchanged)
  await executeQuery("DELETE FROM product_images WHERE product_id = ?", [
    productId,
  ]);
  if (finalizedImages.length) {
    for (let i = 0; i < finalizedImages.length; i++) {
      const img = finalizedImages[i];
      await executeQuery(
        `INSERT INTO product_images
         (product_id, image_order, url, s3_path, alt_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, i + 1, img.s3_path, img.s3_path, img.alt_text, now],
      );
    }
  }

  // Replace feedbacks
  await executeQuery("DELETE FROM product_feedbacks WHERE product_id = ?", [
    productId,
  ]);
  if (data.feedbacks?.length) {
    for (let i = 0; i < data.feedbacks.length; i++) {
      const fb = data.feedbacks[i];
      await executeQuery(
        "INSERT INTO product_feedbacks (product_id, name, content, count, created_at) VALUES (?, ?, ?, ?, ?)",
        [productId, fb.name, fb.content, fb.count || 0, now],
      );
    }
  }
}

// ----------------------------------------------------------------------
// API Route Handler
// ----------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // 1. Parse and normalise the incoming data
    const newData = await req.json();
    console.log("Incoming newData:", JSON.stringify(newData, null, 2));

    // Clean up "null" strings for all optional fields
    if (newData.ean === "null") newData.ean = null;
    if (newData.asin === "null") newData.asin = null;
    if (newData.sku === "null") newData.sku = null;
    if (newData.baselinker_id === "null") newData.baselinker_id = null;
    if (newData.shopify_id === "null") newData.shopify_id = null;
    if (newData.note === "null") newData.note = null;

    // Extract slugs
    const productSlug = newData.slug.split("/").pop();
    const categorySlug = newData.slug.split("/")[0];
    newData.category = categorySlug;

    // Basic validation
    if (!newData.title || !newData.slug) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, slug" },
        { status: 400 },
      );
    }

    // 2. Check for an existing product using the provided id
    const existing = await getProductById(newData.id, {
      transformToForm: true,
    });
    const productId = existing?.id || uuidv4();

    // 3. Image orchestration (move old images to temp, process new ones)
    if (existing?.images) {
      await moveExistingToTemp(productSlug, existing.images);
    }

    const finalizedImages = await processImages(
      newData.images || [],
      newData.category,
      productSlug,
      existing?.images || [],
    );

    // 4. Upsert product and all child records into D1
    await upsertProductData(
      productId,
      { ...newData, slug: productSlug },
      finalizedImages,
      !!existing,
    );

    // 5. Clean up any leftover images in R2
    await cleanupImagesFromR2(newData.category, productSlug, finalizedImages);

    // 6. Return success
    return NextResponse.json({
      success: true,
      id: productId,
      message: "Product synced successfully",
    });
  } catch (error: any) {
    console.error("💥 Save Error:", error);
    const userMessage = formatDatabaseError(error);

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 500 },
    );
  }
}
