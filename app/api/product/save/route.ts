// app/api/product/save/route.ts

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getProductById } from "../../../utils/d1/product/readProduct";
import {
  cleanupImagesFromR2,
  moveExistingToTemp,
  processImages,
} from "../../../utils/images/productImageService";
import { executeBatch, executeQuery } from "../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { measureTime, logMetric } from "../../../utils/performance";

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

// ----------------------------------------------------------------------
// Helpers for batched inserts with chunking
// ----------------------------------------------------------------------

/** Chunk an array into smaller arrays of a given max size. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Build a list of batched INSERT statements for a given table and rows.
 * Each statement stays under the SQLite variable limit (~999) by chunking.
 */
function buildBatchedInsert(
  tableName: string,
  columns: string[],
  rows: any[][], // each inner array is a row of values
  maxRowsPerStatement: number = 100, // safety margin
): D1BatchStatement[] {
  if (rows.length === 0) return [];

  const placeholdersPerRow = columns.length;
  // SQLite's max variables is 999; keep total params <= 500 to be safe.
  const maxAllowedRows = Math.floor(500 / placeholdersPerRow);
  const effectiveChunkSize = Math.min(maxRowsPerStatement, maxAllowedRows, 1);

  const statements: D1BatchStatement[] = [];
  const chunks = chunkArray(rows, effectiveChunkSize);

  for (const chunk of chunks) {
    const placeholders = chunk
      .map(() => `(${columns.map(() => "?").join(", ")})`)
      .join(", ");
    const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${placeholders}`;
    const params = chunk.flat();
    statements.push({ sql, params });
  }

  return statements;
}

// ----------------------------------------------------------------------
// Updated upsert function with logging
// ----------------------------------------------------------------------
async function upsertProductData(
  productId: string,
  data: ProductData,
  finalizedImages: FinalizedImage[],
  isUpdate: boolean,
  db: any,
  createdAt?: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const createdAtTimestamp = createdAt ?? now;
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
      createdAtTimestamp,
      now,
    ],
  });

  // 2. Delete all child records (single statements per table)
  queue.push({
    sql: "DELETE FROM product_paragraphs WHERE product_id = ?",
    params: [productId],
  });
  queue.push({
    sql: "DELETE FROM product_features WHERE product_id = ?",
    params: [productId],
  });
  queue.push({
    sql: "DELETE FROM product_specifications WHERE product_id = ?",
    params: [productId],
  });
  queue.push({
    sql: "DELETE FROM product_images WHERE product_id = ?",
    params: [productId],
  });
  queue.push({
    sql: "DELETE FROM product_feedbacks WHERE product_id = ?",
    params: [productId],
  });

  // 3. Batched inserts for paragraphs
  if (data.paragraphs?.length) {
    const rows = data.paragraphs.map((content, index) => [
      productId,
      index + 1,
      content,
      now,
    ]);
    const stmts = buildBatchedInsert(
      "product_paragraphs",
      ["product_id", "paragraph_order", "content", "created_at"],
      rows,
    );
    queue.push(...stmts);
  }

  // 4. Batched inserts for features
  if (data.features?.length) {
    const rows = data.features.map((feature, index) => [
      productId,
      index + 1,
      feature.title,
      feature.description,
      now,
    ]);
    const stmts = buildBatchedInsert(
      "product_features",
      ["product_id", "feature_order", "title", "description", "created_at"],
      rows,
    );
    queue.push(...stmts);
  }

  // 5. Batched inserts for specifications
  if (data.specifications?.length) {
    const rows = data.specifications.map((spec, index) => [
      productId,
      index + 1,
      spec.key,
      spec.value,
      now,
    ]);
    const stmts = buildBatchedInsert(
      "product_specifications",
      ["product_id", "spec_order", "key", "value", "created_at"],
      rows,
    );
    queue.push(...stmts);
  }

  // 6. Batched inserts for images
  if (finalizedImages.length) {
    const rows = finalizedImages.map((img, index) => [
      productId,
      index + 1,
      img.s3_path, // url column
      img.s3_path, // s3_path column (same value)
      img.alt_text,
      now,
    ]);
    const stmts = buildBatchedInsert(
      "product_images",
      ["product_id", "image_order", "url", "s3_path", "alt_text", "created_at"],
      rows,
    );
    queue.push(...stmts);
  }

  // 7. Batched inserts for feedbacks
  if (data.feedbacks?.length) {
    const rows = data.feedbacks.map((fb) => [
      productId,
      fb.name,
      fb.content,
      fb.count || 0,
      now,
    ]);
    const stmts = buildBatchedInsert(
      "product_feedbacks",
      ["product_id", "name", "content", "count", "created_at"],
      rows,
    );
    queue.push(...stmts);
  }

  // 8. Recompute all counts in one single UPDATE (replaces triggers)
  queue.push({
    sql: `
      UPDATE products SET
        image_count = (SELECT COUNT(*) FROM product_images WHERE product_id = ?),
        specs_count = (SELECT COUNT(*) FROM product_specifications WHERE product_id = ?),
        paragraphs_count = (SELECT COUNT(*) FROM product_paragraphs WHERE product_id = ?),
        features_count = (SELECT COUNT(*) FROM product_features WHERE product_id = ?),
        feedbacks_count = (SELECT COUNT(*) FROM product_feedbacks WHERE product_id = ?)
      WHERE id = ?
    `,
    params: [productId, productId, productId, productId, productId, productId],
  });

  // Execute the whole batch atomically
  await executeBatch(queue, db);
}

// ----------------------------------------------------------------------
// Helper: Partial update – only baselinker_id via SKU
// ----------------------------------------------------------------------
async function updateBaselinkerId(
  sku: string,
  baselinkerId: string | null,
  db: any,
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
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;
  const bucket = (env as any).UPLOADS_BUCKET;
  const images = (env as any).IMAGES;

  const totalStart = performance.now();

  try {
    const newData = (await req.json()) as any;

    // Partial update (baselinker_id only) – log minimal
    if (newData.partial === true && newData.sku) {
      const { sku, baselinker_id } = newData;
      if (baselinker_id === undefined) {
        return NextResponse.json(
          { success: false, error: "Missing baselinker_id for partial update" },
          { status: 400 },
        );
      }
      await updateBaselinkerId(sku, baselinker_id, db);
      logMetric("product_save_partial", 1, { sku });
      return NextResponse.json({
        success: true,
        message: `Updated baselinker_id for SKU ${sku}`,
      });
    }

    // Sanitize inputs
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

    // Get existing product and determine ID
    let existing = null;
    let productId: string;
    if (
      newData.id &&
      typeof newData.id === "string" &&
      newData.id.trim() !== ""
    ) {
      // Measure getProductById
      existing = await measureTime("getProductById", async () =>
        getProductById(newData.id, { db, transformToForm: true }),
      );
      productId = existing?.id || uuidv4();
    } else {
      productId = uuidv4();
    }

    // --- 1. Move existing images to temp (measured) ---
    if (existing?.images) {
      await measureTime("moveExistingToTemp", async () =>
        moveExistingToTemp(productSlug, existing.images, bucket),
      );
    }

    // --- 2. Process new images (measured) ---
    const finalizedImages = await measureTime("processImages", async () =>
      processImages(
        newData.images || [],
        newData.category,
        productSlug,
        existing?.images || [],
        bucket,
        images,
      ),
    );

    // --- 3. Upsert product data (measured) ---
    await measureTime("upsertProductData", async () => {
      // Disable foreign key checks
      await executeQuery("PRAGMA foreign_keys = OFF", [], db);
      try {
        const existingCreatedAt = existing?.created_at;
        await upsertProductData(
          productId,
          { ...newData, slug: productSlug } as ProductData,
          finalizedImages,
          !!existing,
          db,
          existingCreatedAt,
        );
      } finally {
        await executeQuery("PRAGMA foreign_keys = ON", [], db);
      }
    });

    // --- 4. Cleanup unused R2 objects (measured) ---
    await measureTime("cleanupImagesFromR2", async () =>
      cleanupImagesFromR2(
        newData.category,
        productSlug,
        finalizedImages,
        bucket,
      ),
    );

    // Build response (unchanged)
    const updatedImages = finalizedImages.map((img) => ({
      url: img.url,
      s3Path: img.s3_path,
      altText: img.alt_text,
      isUploaded: true,
      needsUpload: false,
      uploadStatus: "completed" as const,
    }));

    // Log final metric with breakdown
    const totalDuration = performance.now() - totalStart;
    logMetric("product_save_total", Math.round(totalDuration), {
      product_id: productId,
      image_count: finalizedImages.length,
      paragraphs: newData.paragraphs?.length || 0,
      features: newData.features?.length || 0,
      specs: newData.specifications?.length || 0,
      is_update: !!existing,
    });

    return NextResponse.json({
      success: true,
      id: productId,
      message: "Product synced successfully",
      updatedImages,
    });
  } catch (error: any) {
    console.error("💥 Save Error:", error);
    // Also log error metric
    logMetric("product_save_error", 1, { error: error.message });
    return NextResponse.json(
      { success: false, error: formatDatabaseError(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

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
