// app/api/product/save/route.ts

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getProductById } from "../../../utils/d1/product/readProduct";
import {
  cleanupImagesFromR2,
  moveExistingToTemp,
  processImages,
} from "../../../utils/images/productImageService";
import { executeBatch } from "../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare"; // <-- add import
import type { D1Database } from "@cloudflare/workers-types"; // optional but good

// ----------------------------------------------------------------------
// Helper to format D1/SQLite errors into user‑friendly messages
// ----------------------------------------------------------------------
function formatDatabaseError(error: any): string {
  const message = error?.message || String(error);

  const toUserFriendlyField = (field: string): string => {
    const base = field.includes(".") ? field.split(".").pop()! : field;
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
    return base
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
    } catch (e) {}
  }

  const uniqueMatch = message.match(/UNIQUE constraint failed:\s*(\S+)/i);
  if (uniqueMatch) {
    const field = toUserFriendlyField(uniqueMatch[1]);
    return `${field} already exists. Please use a different ${field.toLowerCase()}.`;
  }

  return message.split("\n")[0].replace(/^Error:\s*/, "");
}

// ----------------------------------------------------------------------
// Type Definitions
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
  specifications?: Array<{ key: string; value: string }>;
  vat_rate?: number;
  rrp?: number | null;
  weight?: number | null;
  quantity?: number;
  price_brutto?: number | null;
  shipping_method?: string | null;
}

interface FinalizedImage {
  url: string;
  s3_path: string;
  alt_text: string;
}

interface D1BatchStatement {
  sql: string;
  params: any[];
}

/**
 * Packs all mutations into a single atomic native D1 transaction block.
 * Now requires a `db` instance.
 */
async function upsertProductData(
  productId: string,
  data: ProductData,
  finalizedImages: FinalizedImage[],
  isUpdate: boolean,
  db: any, // <-- using any
) {
  const now = Math.floor(Date.now() / 1000);
  const queue: D1BatchStatement[] = [];

  // 1. Master Product Record Upsert
  queue.push({
    sql: `
      INSERT INTO products (
        id, slug, title, sku, ean, asin,
        baselinker_id, shopify_id, category,
        condition, note, 
        vat_rate, rrp, weight, quantity, price_brutto, shipping_method,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        vat_rate = excluded.vat_rate,
        rrp = excluded.rrp,
        weight = excluded.weight,
        quantity = excluded.quantity,
        price_brutto = excluded.price_brutto,
        shipping_method = excluded.shipping_method,
        updated_at = excluded.updated_at
    `,
    params: [
      productId,
      data.slug,
      data.title,
      data.sku || null,
      data.ean || null,
      data.asin || null,
      data.baselinker_id || null,
      data.shopify_id || null,
      data.category,
      data.condition || null,
      data.note || null,
      data.vat_rate ?? 0,
      data.rrp ?? null,
      data.weight ?? null,
      data.quantity ?? 0,
      data.price_brutto ?? null,
      data.shipping_method ?? null,
      isUpdate ? null : now,
      now,
    ],
  });

  // 2. Paragraphs
  queue.push({
    sql: "DELETE FROM product_paragraphs WHERE product_id = ?",
    params: [productId],
  });
  if (data.paragraphs?.length) {
    data.paragraphs.forEach((content, index) => {
      queue.push({
        sql: "INSERT INTO product_paragraphs (product_id, paragraph_order, content, created_at) VALUES (?, ?, ?, ?)",
        params: [productId, index + 1, content, now],
      });
    });
  }

  // 3. Features
  queue.push({
    sql: "DELETE FROM product_features WHERE product_id = ?",
    params: [productId],
  });
  if (data.features?.length) {
    data.features.forEach((feature, index) => {
      queue.push({
        sql: "INSERT INTO product_features (product_id, feature_order, title, description, created_at) VALUES (?, ?, ?, ?, ?)",
        params: [productId, index + 1, feature.title, feature.description, now],
      });
    });
  }

  // 4. Specifications
  queue.push({
    sql: "DELETE FROM product_specifications WHERE product_id = ?",
    params: [productId],
  });
  if (data.specifications?.length) {
    data.specifications.forEach((spec, index) => {
      queue.push({
        sql: "INSERT INTO product_specifications (product_id, spec_order, key, value, created_at) VALUES (?, ?, ?, ?, ?)",
        params: [productId, index + 1, spec.key, spec.value, now],
      });
    });
  }

  // 5. Images
  queue.push({
    sql: "DELETE FROM product_images WHERE product_id = ?",
    params: [productId],
  });
  if (finalizedImages.length) {
    finalizedImages.forEach((img, index) => {
      queue.push({
        sql: "INSERT INTO product_images (product_id, image_order, url, s3_path, alt_text, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        params: [
          productId,
          index + 1,
          img.s3_path,
          img.s3_path,
          img.alt_text,
          now,
        ],
      });
    });
  }

  // 6. Feedbacks
  queue.push({
    sql: "DELETE FROM product_feedbacks WHERE product_id = ?",
    params: [productId],
  });
  if (data.feedbacks?.length) {
    data.feedbacks.forEach((fb, index) => {
      queue.push({
        sql: "INSERT INTO product_feedbacks (product_id, name, content, count, created_at) VALUES (?, ?, ?, ?, ?)",
        params: [productId, fb.name, fb.content, fb.count || 0, now],
      });
    });
  }

  // Execute batch – pass db (any)
  await executeBatch(queue, db);
}
// ----------------------------------------------------------------------
// Helper: Partial update – only baselinker_id via SKU
// ----------------------------------------------------------------------
async function updateBaselinkerId(
  sku: string,
  baselinkerId: string | null,
  db: any, // <-- using any
) {
  const now = Math.floor(Date.now() / 1000);
  const result = await executeBatch(
    [
      {
        sql: `UPDATE products SET baselinker_id = ?, updated_at = ? WHERE sku = ?`,
        params: [baselinkerId, now, sku],
      },
    ],
    db,
  );

  if (result?.[0]?.meta?.changes === 0) {
    throw new Error(`No product found with SKU: ${sku}`);
  }
  return true;
}

// ----------------------------------------------------------------------
// API Route Handlers
// ----------------------------------------------------------------------
export async function POST(req: Request) {
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;
  const bucket = (env as any).UPLOADS_BUCKET;
  const images = (env as any).IMAGES; // <-- get the Images binding

  try {
    const newData = (await req.json()) as any;

    if (newData.partial === true && newData.sku) {
      const { sku, baselinker_id } = newData;
      if (baselinker_id === undefined) {
        return NextResponse.json(
          { success: false, error: "Missing baselinker_id for partial update" },
          { status: 400 },
        );
      }
      // Pass db to updateBaselinkerId
      await updateBaselinkerId(sku, baselinker_id, db);
      return NextResponse.json({
        success: true,
        message: `Updated baselinker_id for SKU ${sku}`,
      });
    }

    function sanitizeString(value: any): any {
      if (value === null || value === undefined) return null;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ||
        trimmed === "null" ||
        trimmed === "NULL" ||
        trimmed === "none"
        ? null
        : value;
    }

    newData.ean = sanitizeString(newData.ean);
    newData.asin = sanitizeString(newData.asin);
    newData.sku = sanitizeString(newData.sku);
    newData.baselinker_id = sanitizeString(newData.baselinker_id);
    newData.shopify_id = sanitizeString(newData.shopify_id);
    newData.note = sanitizeString(newData.note);
    newData.rrp = sanitizeString(newData.rrp);
    newData.weight = sanitizeString(newData.weight);
    newData.price_brutto = sanitizeString(newData.price_brutto);
    newData.shipping_method = sanitizeString(newData.shipping_method);

    const productSlug = newData.slug.split("/").pop();
    const categorySlug = newData.slug.split("/")[0];
    newData.category = categorySlug;

    if (!newData.title || !newData.slug) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, slug" },
        { status: 400 },
      );
    }

    // 2. Pass db to getProductById
    // Check if we have an ID to look up
    let existing = null;
    let productId: string;
    if (
      newData.id &&
      typeof newData.id === "string" &&
      newData.id.trim() !== ""
    ) {
      existing = await getProductById(newData.id, {
        db,
        transformToForm: true,
      });
      productId = existing?.id || uuidv4();
    } else {
      productId = uuidv4();
    }

    if (existing?.images) {
      await moveExistingToTemp(productSlug, existing.images, bucket);
    }

    const finalizedImages = await processImages(
      newData.images || [],
      newData.category,
      productSlug,
      existing?.images || [],
      bucket,
      images, // <-- pass it
    );

    // 3. Pass db to upsertProductData
    await upsertProductData(
      productId,
      { ...newData, slug: productSlug } as ProductData,
      finalizedImages,
      !!existing,
      db,
    );

    const updatedImages = finalizedImages.map((img) => ({
      url: img.url,
      s3Path: img.s3_path,
      altText: img.alt_text,
      isUploaded: true,
      needsUpload: false,
      uploadStatus: "completed",
    }));

    await cleanupImagesFromR2(
      newData.category,
      productSlug,
      finalizedImages,
      bucket,
    );

    return NextResponse.json({
      success: true,
      id: productId,
      message: "Product synced successfully",
      updatedImages,
    });
  } catch (error: any) {
    console.error("💥 Save Error:", error);
    return NextResponse.json(
      { success: false, error: formatDatabaseError(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;

  try {
    const body = (await req.json()) as {
      sku?: string;
      baselinker_id?: string | null;
    };
    const { sku, baselinker_id } = body;

    if (!sku || baselinker_id === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Pass db to updateBaselinkerId
    await updateBaselinkerId(sku, baselinker_id, db);
    return NextResponse.json({
      success: true,
      message: `Updated baselinker_id for SKU ${sku}`,
    });
  } catch (error: any) {
    console.error("💥 PATCH Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update" },
      { status: 500 },
    );
  }
}
