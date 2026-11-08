// app/api/baselinker-sync-product/route.ts
import { NextResponse } from "next/server";
import { getProductById } from "../../utils/d1/product/readProduct";
import { generateProductHTML } from "../../utils/htmlGenerator/generateProductHTML";
import { executeQuery } from "../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BASELINKER_API_URL = "https://api.baselinker.com/connector.php";
const MAX_EXTRA_DESCRIPTION_LENGTH = 200;
const INVENTORY_CACHE_TTL_MS = 5 * 60 * 1000;

// Only Base-native warehouses (`bl_<id>`) accept thresholds/stock
const BASE_WAREHOUSE_ID = /^bl_\d+$/;

interface IncomingRequestBody {
  productId?: string;
}

interface BLInventoryContext {
  inventory_id: number;
  default_price_group: number;
  default_warehouse: string;
}

interface BaseLinkerResponsePayload {
  status: "SUCCESS" | "ERROR";
  error_message?: string;
  error_code?: string;
  product_id?: number;
  warnings?: Record<string, any>;
  [key: string]: any;
}

interface CategoryDbRow {
  baselinker_category_id: string | number;
}

const clampExtra = (value: any): string =>
  (value == null ? "" : String(value)).slice(0, MAX_EXTRA_DESCRIPTION_LENGTH);

// ---- Per-isolate cache for inventory context (avoids re-hitting Base) ----
let cachedInventoryContext: {
  ctx: BLInventoryContext;
  ts: number;
} | null = null;

async function fetchInventoryContext(
  token: string,
): Promise<BLInventoryContext> {
  const now = Date.now();
  if (
    cachedInventoryContext &&
    now - cachedInventoryContext.ts < INVENTORY_CACHE_TTL_MS
  ) {
    return cachedInventoryContext.ctx;
  }

  // Env overrides skip the network call entirely
  const envInventory = process.env.BASELINKER_INVENTORY_ID;
  const envPriceGroup = process.env.BASELINKER_PRICE_GROUP_ID;
  const envWarehouse = process.env.BASELINKER_DEFAULT_WAREHOUSE;

  if (envInventory && envPriceGroup && envWarehouse) {
    const ctx: BLInventoryContext = {
      inventory_id: Number(envInventory),
      default_price_group: Number(envPriceGroup),
      default_warehouse: envWarehouse,
    };
    cachedInventoryContext = { ctx, ts: now };
    return ctx;
  }

  const body = new URLSearchParams({
    method: "getInventories",
    parameters: "{}",
  });
  const res = await fetch(BASELINKER_API_URL, {
    method: "POST",
    headers: {
      "X-BLToken": token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const json: any = await res.json();
  if (json.status !== "SUCCESS") {
    throw new Error(
      json.error_message || "Failed to fetch inventories from Baselinker",
    );
  }
  const inventories = json.inventories || [];
  const inv = inventories.find((i: any) => i.is_default) || inventories[0];
  if (!inv) throw new Error("No inventories returned from Baselinker");

  const ctx: BLInventoryContext = {
    inventory_id: Number(envInventory || inv.inventory_id),
    default_price_group: Number(envPriceGroup || inv.default_price_group),
    default_warehouse: String(envWarehouse || inv.default_warehouse || ""),
  };
  cachedInventoryContext = { ctx, ts: now };
  return ctx;
}

// ---- Normalize the v2 `warnings` payload into readable strings ----
function flattenWarnings(w: any): string[] {
  if (!w || typeof w !== "object") return [];
  const out: string[] = [];
  for (const group of Object.keys(w)) {
    const g = (w as any)[group];
    if (typeof g === "string") {
      out.push(`${group}: ${g}`);
    } else if (g && typeof g === "object") {
      for (const [k, v] of Object.entries(g)) {
        out.push(
          `${group}.${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`,
        );
      }
    }
  }
  return out;
}

export async function POST(req: Request) {
  // ---- Env / DB ----
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;
  const token =
    (env as any).BASELINKER_TOKEN || process.env.BASELINKER_TOKEN || "";

  if (!token) {
    return NextResponse.json(
      { error: "BASELINKER_TOKEN is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json()) as IncomingRequestBody;
    const productId = body?.productId;

    if (!productId || !UUID_REGEX.test(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID syntax validation" },
        { status: 400 },
      );
    }

    // ---- Load product ----
    const product = await getProductById(productId, {
      db,
      transformToForm: true,
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found inside D1 replica storage" },
        { status: 404 },
      );
    }
    if (!product.title?.trim()) {
      return NextResponse.json(
        { error: "Product title value missing or empty" },
        { status: 400 },
      );
    }

    const rawBaselinkerId = product.baselinker_id;
    const isUpdate =
      rawBaselinkerId &&
      rawBaselinkerId !== "null" &&
      rawBaselinkerId.trim() !== "";

    if ((product.images?.length || 0) > 16) {
      return NextResponse.json(
        { error: "Too many images (BaseLinker max limit is 16)" },
        { status: 400 },
      );
    }

    // ---- Resolve inventory + defaults ----
    const invCtx = await fetchInventoryContext(token);

    // ---- Transform description ----
    const htmlDescription = await generateProductHTML(productId);

    // ---- Transform images: array → position-keyed object ----
    const imagesObj: Record<string, string> = {};
    (product.images || []).forEach((img: any, idx: number) => {
      if (img?.url) imagesObj[String(idx)] = `url:${img.url}`;
    });

    // ---- Transform features: array → object ----
    const featuresObj: Record<string, string> = {};
    for (const spec of product.specifications || []) {
      if (spec?.key) featuresObj[String(spec.key)] = String(spec.value ?? "");
    }
    if (product.rrp) featuresObj["RRP"] = `£${product.rrp}`;
    if (product.shipping_method) {
      featuresObj["Shipping method"] = String(product.shipping_method);
    }

    // ---- Transform thresholds: [{ location, number }] → { [warehouseId]: number } ----
    //   Only Base-native warehouses (`bl_*`) accept thresholds in Base.
    //   Non-`bl_*` entries are surfaced back to the caller so the UI can warn.
    const thresholdsMap: Record<string, number> = {};
    const skippedThresholds: Array<{
      location: string;
      number: number;
      reason: string;
    }> = [];
    for (const t of product.thresholds || []) {
      const wid = typeof t?.location === "string" ? t.location.trim() : "";
      const val = Number(t?.number);
      if (!wid || !Number.isFinite(val) || val < 0) continue;
      if (!BASE_WAREHOUSE_ID.test(wid)) {
        skippedThresholds.push({
          location: wid,
          number: val,
          reason: "only Base-native warehouses (bl_*) accept thresholds",
        });
        continue;
      }
      thresholdsMap[wid] = val;
    }

    // ---- Build v2 payload ----
    const payload: any = {
      inventory_id: invCtx.inventory_id,
      is_bundle: false,
      text_fields: {
        name: product.title,
        description: htmlDescription,
        description_extra1: clampExtra(product.additional_description_1),
        description_extra2: clampExtra(product.additional_description_2),
        description_extra3: clampExtra(product.additional_description_3),
        features: featuresObj,
      },
      images: imagesObj,
    };

    if (product.sku) payload.sku = String(product.sku);
    if (product.ean) payload.ean = String(product.ean);
    if (product.asin) payload.asin = String(product.asin);

    // Thresholds: docs say "Only supplied entries are changed. An empty map
    // makes no change. Value 0 clears the threshold." → safe to send on every
    // sync whenever we have at least one entry.
    if (Object.keys(thresholdsMap).length > 0) {
      payload.thresholds = thresholdsMap;
    }

    if (isUpdate) {
      const blIdNum = Number(rawBaselinkerId);
      if (!Number.isFinite(blIdNum)) {
        return NextResponse.json(
          {
            error: `Stored baselinker_id "${rawBaselinkerId}" is not numeric — cannot update via Base API`,
          },
          { status: 400 },
        );
      }
      payload.product_id = blIdNum;
    }

    // Preserve current create-only behavior for price, stock, tax, weight
    if (!isUpdate) {
      const category = (await executeQuery(
        `SELECT baselinker_category_id FROM categories WHERE slug = ?`,
        [product.selectedCategory],
        db,
      )) as CategoryDbRow[];

      const catIdRaw =
        category?.[0]?.baselinker_category_id ||
        process.env.BASELINKER_DEFAULT_CATEGORY_ID ||
        "902373";
      const catIdNum = Number(catIdRaw);
      payload.category_id = Number.isFinite(catIdNum) ? catIdNum : catIdRaw;

      payload.tax_rate = Number(product.vat_rate) || 0;
      payload.weight = Number(product.weight) || 0;

      const price = Number(product.price_brutto);
      if (Number.isFinite(price) && price > 0) {
        payload.prices = {
          [String(invCtx.default_price_group)]: price,
        };
      }

      const qty = Number(product.quantity);
      if (Number.isFinite(qty) && qty >= 0) {
        const stockWarehouse =
          Object.keys(thresholdsMap)[0] || invCtx.default_warehouse;
        if (stockWarehouse && BASE_WAREHOUSE_ID.test(stockWarehouse)) {
          payload.stock = { [stockWarehouse]: qty };
        }
      }
    }

    // ---- Call Base ----
    const formData = new URLSearchParams();
    formData.append("method", "addInventoryProduct");
    formData.append("parameters", JSON.stringify(payload));

    const response = await fetch(BASELINKER_API_URL, {
      method: "POST",
      headers: {
        "X-BLToken": token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = (await response.json()) as BaseLinkerResponsePayload;

    if (result.status === "ERROR") {
      const userMessage =
        result.error_message || "Unknown BaseLinker integration failure";

      // Stale mapping recovery (unchanged)
      if (userMessage.includes("Product not found") && isUpdate) {
        await executeQuery(
          `UPDATE products SET baselinker_id = NULL WHERE id = ?`,
          [productId],
          db,
        );
        return NextResponse.json(
          {
            error:
              "Stale Baselinker record mapping split detected. Object context flushed, please retry sync.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: userMessage }, { status: 500 });
    }

    // ---- Persist new baselinker_id on create ----
    if (!isUpdate && result.product_id) {
      await executeQuery(
        `UPDATE products SET baselinker_id = ?, updated_at = unixepoch() WHERE id = ?`,
        [String(result.product_id), productId],
        db,
      );
    }

    const warnings = flattenWarnings(result.warnings);

    return NextResponse.json({
      success: true,
      message: isUpdate
        ? "BaseLinker product updated"
        : "BaseLinker product created",
      baselinker_product_id: result.product_id,
      threshold_count: Object.keys(thresholdsMap).length,
      skipped_thresholds: skippedThresholds.length
        ? skippedThresholds
        : undefined,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error: any) {
    console.error("💥 [baselinker-sync] Fatal exception:", error);
    return NextResponse.json(
      { error: error.message || "Internal network syncing failure" },
      { status: 500 },
    );
  }
}
