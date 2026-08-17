// ./app/api/phonecheck/import/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeBatch } from "../../../utils/d1/execute";
import { getProductBySku } from "../../../utils/d1/product/readProduct";
import { generateSeoSlug } from "../../../utils/images/seoGenerator";

// ----------------------------------------------------------------------
// Type Definitions
// ----------------------------------------------------------------------
interface ImportRecord {
  make: string;
  model: string;
  color: string;
  memory: string;
  grade: string;
  batteryHealth: number | string;
  working: string;
  lpn: string;
  note?: string;
  failed?: string;
  category?: string; // per-record category – now required
}

interface ImportRequest {
  records: ImportRecord[];
  // categorySlug removed – each record must provide its own category
}

// Mapping PhoneCheck grade → our condition string
const gradeToCondition: Record<string, string> = {
  "EX-REF": "Excellent - Refurbished",
  "VG-REF": "Very Good - Refurbished",
  "GD-REF": "Good - Refurbished",
  USE: "Used",
  PARTS: "For parts or not working",
  B: "Used", // fallback for 'B' grade
};

// Helper: sanitise string for SKU (uppercase, alphanumeric + dash)
function sanitiseForSku(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 4);
}

// Generate SKU: MAKE-PHO-MODEL-MEMORY-COLOR-LPN-GRADE
function generateSku(
  make: string,
  model: string,
  memory: string,
  color: string,
  lpn: string,
  grade: string,
): string {
  const makePart = sanitiseForSku(make) || "XXXX";
  const modelPart = sanitiseForSku(model) || "XXXX";
  const colorPart = sanitiseForSku(color) || "XXXX";
  const memoryClean = memory.replace(/\s/g, "").toUpperCase();
  const lpnClean = lpn.replace(/[^A-Z0-9]/g, "").toUpperCase();
  const gradeClean = grade.replace(/[^A-Z0-9-]/g, "").toUpperCase();

  return `${makePart}-PHO-${modelPart}-${memoryClean}-${colorPart}-${lpnClean}-${gradeClean}`;
}

// Generate title: "Make Model Color Memory BatteryHealth% Fully Working"
function generateTitle(
  make: string,
  model: string,
  color: string,
  memory: string,
  batteryHealth: number | string,
): string {
  let battery: number;
  if (typeof batteryHealth === "number") {
    battery = batteryHealth;
  } else {
    battery = parseInt(batteryHealth, 10);
    if (isNaN(battery)) battery = 0;
  }
  return `${make} ${model} ${color} ${memory} ${battery}% Fully Working`;
}

// Helper to format database errors
function formatDbError(error: any): string {
  const message = error?.message || String(error);
  // D1 errors are in the format: "D1_ERROR: UNIQUE constraint failed: products.slug: SQLITE_CONSTRAINT ..."
  const match = message.match(/UNIQUE constraint failed:\s*(\S+)/);
  if (match) {
    const field = match[1];
    if (field.includes("slug")) {
      return "A product with this title already exists. Please change the title.";
    }
    if (field.includes("sku")) {
      return "This SKU already exists. The system will try to generate a unique SKU automatically.";
    }
    if (
      field.includes("ean") ||
      field.includes("asin") ||
      field.includes("baselinker_id") ||
      field.includes("shopify_id")
    ) {
      return `Duplicate ${field.replace("products.", "")} – please check your data.`;
    }
    return `Duplicate value for ${field.replace("products.", "")}. Please check your data.`;
  }
  // Fallback
  return message.split(":")[0] || "Database error";
}

export async function POST(req: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const body = (await req.json()) as ImportRequest;
    const { records } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: "No records provided" },
        { status: 400 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const results: Array<{
      success: boolean;
      sku: string;
      title: string;
      error?: string;
      id?: string;
    }> = [];

    // Process each record
    for (const record of records) {
      const {
        make,
        model,
        color,
        memory,
        grade,
        batteryHealth,
        working,
        lpn,
        note,
        failed,
        category,
      } = record;

      // Basic validation
      if (!make || !model || !color || !memory || !grade || !lpn) {
        results.push({
          success: false,
          sku: "",
          title: "",
          error:
            "Missing required fields (Make, Model, Color, Memory, Grade, LPN)",
        });
        continue;
      }

      // Category is now required per record
      if (!category) {
        results.push({
          success: false,
          sku: "",
          title: "",
          error: "Category missing for this record",
        });
        continue;
      }

      // Check if grade is valid, else fallback to "Used" and warn
      let condition = gradeToCondition[grade];
      let warning = "";
      if (!condition) {
        condition = "Used";
        warning = `Unrecognised grade "${grade}" – defaulted to "Used"`;
      }

      // Combine note, failed, and warning
      let combinedNote = note || "";
      if (failed && failed.trim()) {
        combinedNote += (combinedNote ? " | " : "") + `Failed tests: ${failed}`;
      }
      if (warning) {
        combinedNote += (combinedNote ? " | " : "") + warning;
      }

      // Title
      const title = generateTitle(make, model, color, memory, batteryHealth);

      // Generate unique SKU
      let baseSku = generateSku(make, model, memory, color, lpn, grade);
      let sku = baseSku;
      let counter = 1;
      while (true) {
        const existing = await getProductBySku(sku, { db });
        if (!existing) break;
        sku = `${baseSku}-${counter}`;
        counter++;
      }

      // Slug: use unique SKU as suffix to guarantee uniqueness
      const slugBase = generateSeoSlug(title);
      const slug = `${category}/${slugBase}-${sku}`;

      const productId = uuidv4();

      const productData = {
        id: productId,
        slug: slug,
        title: title,
        sku: sku,
        condition: condition,
        note: combinedNote || null,
        category: category, // use per-record category
        vat_rate: 20,
        rrp: null,
        weight: null,
        quantity: 0,
        price_brutto: null,
        shipping_method: null,
        paragraphs: [],
        features: [],
        images: [],
        feedbacks: [],
        specifications: [],
      };

      try {
        await upsertProductData(productId, productData, [], false, db, now);
        results.push({
          success: true,
          sku,
          title,
          id: productId,
        });
      } catch (err: any) {
        // Format the error message
        const friendlyError = formatDbError(err);
        results.push({
          success: false,
          sku,
          title,
          error: friendlyError,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Import failed" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------------
// Helper: upsertProductData (copied from /api/product/save/route.ts, simplified)
// ----------------------------------------------------------------------
async function upsertProductData(
  productId: string,
  data: any,
  finalizedImages: any[],
  isUpdate: boolean,
  db: any,
  createdAt?: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const createdAtTimestamp = createdAt ?? now;
  const queue: any[] = [];

  // 1. Master record
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

  // Delete related records (empty arrays are handled by DELETE only)
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

  await executeBatch(queue, db);
}
