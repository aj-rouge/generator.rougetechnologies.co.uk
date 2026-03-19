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
// D1 Upsert Logic
// ----------------------------------------------------------------------

interface ProductData {
  id?: string;
  slug: string; // format: "category/product-slug"
  title: string;
  sku?: string | null;
  ean?: string | null;
  asin?: string | null;
  baselinker_id?: string | null;
  shopify_id?: string | null;
  condition?: string | null;
  note?: string | null;
  category: string; // extracted from slug
  paragraphs?: string[];
  features?: Array<{ title: string; description: string }>;
  images?: any[]; // will be replaced by finalizedImages
  feedbacks?: Array<{ name: string; content: string; count?: number }>;
}

interface FinalizedImage {
  url: string; // original source URL (may be temporary)
  s3_path: string; // final CDN URL
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
  const now = Math.floor(Date.now() / 1000); // Unix timestamp (seconds)

  // ----- 1. Upsert the main product record -----
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
    data.slug.split("/").pop()!, // store only the product slug
    data.title,
    data.sku || null,
    data.ean || null,
    data.asin || null,
    data.baselinker_id || null,
    data.shopify_id || null,
    data.category,
    data.condition || null,
    data.note || null,
    isUpdate ? null : now, // keep original created_at on update
    now,
  ]);

  // ----- 2. Replace paragraphs -----
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

  // ----- 3. Replace features -----
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

  // ----- 4. Replace images (using finalized data from the image service) -----
  await executeQuery("DELETE FROM product_images WHERE product_id = ?", [
    productId,
  ]);
  if (finalizedImages.length) {
    for (let i = 0; i < finalizedImages.length; i++) {
      const img = finalizedImages[i];
      // Store the final CDN URL in `url`, and keep the original source in `s3_path` if needed
      // (adjust according to your schema; here we store the final URL in `url` and the R2 key in `s3_path`)
      await executeQuery(
        `INSERT INTO product_images
         (product_id, image_order, url, s3_path, alt_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, i + 1, img.s3_path, img.s3_path, img.alt_text, now],
      );
    }
  }

  // ----- 5. Replace feedbacks -----
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

    // Clean up "null" strings
    if (newData.ean === "null") newData.ean = null;
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
      { ...newData, slug: productSlug }, // store only the product slug part
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
