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
import { measureTime, logMetric } from "../../../utils/performance";
import { getCurrentUser, type User } from "../../../utils/auth";
import { buildAuditStatementParts } from "../../../utils/audit/build";
import { diffProduct } from "../../../utils/audit/diffProduct";
import type { Diff } from "../../../utils/audit/types";

// ----------------------------------------------------------------------
// Helpers
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
    } catch {}
  }

  const uniqueMatch = message.match(/UNIQUE constraint failed:\s*(\S+)/i);
  if (uniqueMatch) {
    const field = toUserFriendlyField(uniqueMatch[1]);
    return `${field} already exists. Please use a different ${field.toLowerCase()}.`;
  }

  return message.split("\n")[0].replace(/^Error:\s*/, "");
}

// ----------------------------------------------------------------------
// Types
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

interface AuditPayload {
  user: User;
  changes: Diff[];
}

// ----------------------------------------------------------------------
// Batched insert helpers
// ----------------------------------------------------------------------
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function buildBatchedInsert(
  tableName: string,
  columns: string[],
  rows: any[][],
  maxRowsPerStatement: number = 100,
): D1BatchStatement[] {
  if (rows.length === 0) return [];

  const placeholdersPerRow = columns.length;
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
// upsertProductData — now accepts an optional audit payload.
// When present, the audit INSERT is appended to the same batch and runs
// atomically with the mutation.
// ----------------------------------------------------------------------
async function upsertProductData(
  productId: string,
  data: ProductData,
  finalizedImages: FinalizedImage[],
  isUpdate: boolean,
  db: any,
  createdAt?: number,
  audit?: AuditPayload | null,
) {
  const now = Math.floor(Date.now() / 1000);
  const createdAtTimestamp = createdAt ?? now;
  const queue: D1BatchStatement[] = [];

  // 1. Master product record
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

  // 2. Clear child tables
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

  // 3. Paragraphs
  if (data.paragraphs?.length) {
    const rows = data.paragraphs.map((content, index) => [
      productId,
      index + 1,
      content,
      now,
    ]);
    queue.push(
      ...buildBatchedInsert(
        "product_paragraphs",
        ["product_id", "paragraph_order", "content", "created_at"],
        rows,
      ),
    );
  }

  // 4. Features
  if (data.features?.length) {
    const rows = data.features.map((feature, index) => [
      productId,
      index + 1,
      feature.title,
      feature.description,
      now,
    ]);
    queue.push(
      ...buildBatchedInsert(
        "product_features",
        ["product_id", "feature_order", "title", "description", "created_at"],
        rows,
      ),
    );
  }

  // 5. Specifications
  if (data.specifications?.length) {
    const rows = data.specifications.map((spec, index) => [
      productId,
      index + 1,
      spec.key,
      spec.value,
      now,
    ]);
    queue.push(
      ...buildBatchedInsert(
        "product_specifications",
        ["product_id", "spec_order", "key", "value", "created_at"],
        rows,
      ),
    );
  }

  // 6. Images
  if (finalizedImages.length) {
    const rows = finalizedImages.map((img, index) => [
      productId,
      index + 1,
      img.s3_path,
      img.s3_path,
      img.alt_text,
      now,
    ]);
    queue.push(
      ...buildBatchedInsert(
        "product_images",
        [
          "product_id",
          "image_order",
          "url",
          "s3_path",
          "alt_text",
          "created_at",
        ],
        rows,
      ),
    );
  }

  // 7. Feedbacks
  if (data.feedbacks?.length) {
    const rows = data.feedbacks.map((fb) => [
      productId,
      fb.name,
      fb.content,
      fb.count || 0,
      now,
    ]);
    queue.push(
      ...buildBatchedInsert(
        "product_feedbacks",
        ["product_id", "name", "content", "count", "created_at"],
        rows,
      ),
    );
  }

  // 8. Recompute counts
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

  // 9. Audit row — appended to the same batch.
  //    Inserted after the mutation so the transaction rolls back atomically
  //    if either the mutation or the audit insert fails.
  if (audit) {
    const { sql, params } = buildAuditStatementParts(audit.user, {
      action: isUpdate ? "update" : "create",
      entityType: "product",
      entityId: productId,
      entityLabel: data.title,
      changes: isUpdate ? audit.changes : null,
      metadata: {
        image_count: finalizedImages.length,
        paragraphs: data.paragraphs?.length ?? 0,
        features: data.features?.length ?? 0,
        specs: data.specifications?.length ?? 0,
        feedbacks: data.feedbacks?.length ?? 0,
        source: "product_save_route",
      },
    });
    queue.push({ sql, params });
  }

  await executeBatch(queue, db);
}

// ----------------------------------------------------------------------
// Partial update — baselinker_id via SKU. Now audited too.
// ----------------------------------------------------------------------
async function updateBaselinkerId(
  sku: string,
  baselinkerId: string | null,
  db: any,
  actor: User,
) {
  const now = Math.floor(Date.now() / 1000);

  // Fetch the current row so we can diff and label it.
  const before = await executeQuery(
    `SELECT id, title, baselinker_id FROM products WHERE sku = ?`,
    [sku],
    db,
  );
  const row = before?.[0];
  if (!row) {
    throw new Error(`No product found with SKU: ${sku}`);
  }

  const changed = row.baselinker_id !== baselinkerId;

  const statements: D1BatchStatement[] = [
    {
      sql: `UPDATE products SET baselinker_id = ?, updated_at = ? WHERE sku = ?`,
      params: [baselinkerId, now, sku],
    },
  ];

  if (changed) {
    const { sql, params } = buildAuditStatementParts(actor, {
      action: "update",
      entityType: "product",
      entityId: row.id,
      entityLabel: row.title,
      changes: [
        {
          field: "baselinker_id",
          old: row.baselinker_id ?? null,
          new: baselinkerId,
        },
      ],
      metadata: { source: "partial_update", sku },
    });
    statements.push({ sql, params });
  }

  const result = await executeBatch(statements, db);
  return result;
}

// ======================================================================
// POST
// ======================================================================
export async function POST(req: Request) {
  // ---- Auth ----
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;
  const bucket = (env as any).UPLOADS_BUCKET;
  const images = (env as any).IMAGES;

  const totalStart = performance.now();

  try {
    const newData = (await req.json()) as any;

    // ---- Partial update path ----
    if (newData.partial === true && newData.sku) {
      const { sku, baselinker_id } = newData;
      if (baselinker_id === undefined) {
        return NextResponse.json(
          { success: false, error: "Missing baselinker_id for partial update" },
          { status: 400 },
        );
      }
      await updateBaselinkerId(sku, baselinker_id, db, user);
      logMetric("product_save_partial", 1, { sku });
      return NextResponse.json({
        success: true,
        message: `Updated baselinker_id for SKU ${sku}`,
      });
    }

    // ---- Sanitize ----
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

    // ---- Fetch existing (for diff, and image handling) ----
    let existing: any = null;
    let productId: string;
    if (
      newData.id &&
      typeof newData.id === "string" &&
      newData.id.trim() !== ""
    ) {
      existing = await measureTime("getProductById", async () =>
        getProductById(newData.id, { db, transformToForm: true }),
      );
      productId = existing?.id || uuidv4();
    } else {
      productId = uuidv4();
    }

    // ---- Compute diff BEFORE mutation, using in-memory snapshots ----
    const changes = diffProduct(existing, newData);
    const hasRealChanges = changes.length > 0;
    const isUpdate = !!existing;
    const auditPayload = isUpdate && !hasRealChanges ? null : { user, changes };
    // ---- Move existing images to temp ----
    if (existing?.images) {
      await measureTime("moveExistingToTemp", async () =>
        moveExistingToTemp(productSlug, existing.images, bucket),
      );
    }

    // ---- Process new images ----
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

    // ---- Upsert + audit, atomic ----
    await measureTime("upsertProductData", async () => {
      await executeQuery("PRAGMA foreign_keys = OFF", [], db);
      try {
        await upsertProductData(
          productId,
          { ...newData, slug: productSlug } as ProductData,
          finalizedImages,
          !!existing,
          db,
          existing?.created_at,
          auditPayload,
        );
      } finally {
        await executeQuery("PRAGMA foreign_keys = ON", [], db);
      }
    });

    // ---- Cleanup unused R2 objects ----
    await measureTime("cleanupImagesFromR2", async () =>
      cleanupImagesFromR2(
        newData.category,
        productSlug,
        finalizedImages,
        bucket,
      ),
    );

    const updatedImages = finalizedImages.map((img) => ({
      url: img.url,
      s3Path: img.s3_path,
      altText: img.alt_text,
      isUploaded: true,
      needsUpload: false,
      uploadStatus: "completed" as const,
    }));

    const totalDuration = performance.now() - totalStart;
    logMetric("product_save_total", Math.round(totalDuration), {
      product_id: productId,
      image_count: finalizedImages.length,
      paragraphs: newData.paragraphs?.length || 0,
      features: newData.features?.length || 0,
      specs: newData.specifications?.length || 0,
      is_update: !!existing,
      change_count: changes.length,
    });

    return NextResponse.json({
      success: true,
      id: productId,
      message: "Product synced successfully",
      updatedImages,
    });
  } catch (error: any) {
    console.error("💥 Save Error:", error);
    logMetric("product_save_error", 1, { error: error.message });
    return NextResponse.json(
      { success: false, error: formatDatabaseError(error) },
      { status: 500 },
    );
  }
}

// ======================================================================
// PATCH — partial baselinker_id update via SKU. Now audited.
// ======================================================================
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

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

    await updateBaselinkerId(sku, baselinker_id, db, user);
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
