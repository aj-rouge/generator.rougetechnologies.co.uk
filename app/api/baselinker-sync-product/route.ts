// app/api/baselinker-sync-product/route.ts
import { NextResponse } from "next/server";
import { getProductById } from "../../utils/d1/product/readProduct";
import { generateProductHTML } from "../../utils/htmlGenerator/generateProductHTML";
import { executeQuery } from "../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare"; // <-- import
import type { D1Database } from "@cloudflare/workers-types";

const DEFAULT_BASELINKER_CATEGORY_ID =
  process.env.BASELINKER_DEFAULT_CATEGORY_ID || "902373";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IncomingRequestBody {
  productId?: string;
}

interface BaseLinkerResponsePayload {
  status: "SUCCESS" | "ERROR";
  error_message?: string;
  product_id?: string | number;
  [key: string]: any;
}

interface CategoryDbRow {
  baselinker_category_id: string | number;
}

export async function POST(req: Request) {
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;

  try {
    const storageId = process.env.BASELINKER_STORAGE_ID || "bl_1";
    const body = (await req.json()) as IncomingRequestBody;
    const productId = body?.productId;

    if (!productId || !UUID_REGEX.test(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID syntax validation" },
        { status: 400 },
      );
    }

    // 2. Pass `db` to getProductById
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

    const htmlDescription = await generateProductHTML(productId);
    const images = (product.images || []).map((img: any) => `url:${img.url}`);
    const features = (product.specifications || []).map((spec: any) => ({
      name: spec.key,
      value: spec.value,
    }));

    if (product.rrp) features.push({ name: "RRP", value: `£${product.rrp}` });
    if (product.shipping_method) {
      features.push({
        name: "Shipping method",
        value: product.shipping_method,
      });
    }

    const payload: any = {
      storage_id: storageId,
      name: product.title,
      description: htmlDescription,
      images,
      features,
    };

    if (product.sku) payload.sku = String(product.sku);
    if (product.ean) payload.ean = String(product.ean);
    if (product.asin) payload.asin = String(product.asin);
    if (isUpdate) payload.product_id = String(rawBaselinkerId);

    if (!isUpdate) {
      // 3. Pass `db` to executeQuery
      const category = (await executeQuery(
        `SELECT baselinker_category_id FROM categories WHERE slug = ?`,
        [product.selectedCategory],
        db, // <-- pass db
      )) as CategoryDbRow[];

      const catId =
        category?.[0]?.baselinker_category_id || DEFAULT_BASELINKER_CATEGORY_ID;
      payload.category_id = catId.toString();
      payload.price_brutto = Number(product.price_brutto) || 0;
      payload.quantity = Number(product.quantity) || 0;
      payload.tax_rate = Number(product.vat_rate) || 0;
      payload.weight = Number(product.weight) || 0;
    }

    const formData = new URLSearchParams();
    formData.append("method", "addProduct");
    formData.append("parameters", JSON.stringify(payload));

    const response = await fetch("https://api.baselinker.com/connector.php", {
      method: "POST",
      headers: {
        "X-BLToken": process.env.BASELINKER_TOKEN!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = (await response.json()) as BaseLinkerResponsePayload;

    if (result.status === "ERROR") {
      let userMessage =
        result.error_message || "Unknown BaseLinker integration failure";
      if (userMessage.includes("Product not found") && isUpdate) {
        // 4. Pass `db` to executeQuery for the update
        await executeQuery(
          `UPDATE products SET baselinker_id = NULL WHERE id = ?`,
          [productId],
          db, // <-- pass db
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

    if (!isUpdate && result.product_id) {
      // 5. Pass `db` to executeQuery for the update
      await executeQuery(
        `UPDATE products SET baselinker_id = ?, updated_at = unixepoch() WHERE id = ?`,
        [result.product_id.toString(), productId],
        db, // <-- pass db
      );
    }

    return NextResponse.json({
      success: true,
      message: isUpdate
        ? "BaseLinker dataset variant updated"
        : "BaseLinker mapping identity created",
      baselinker_product_id: result.product_id,
    });
  } catch (error: any) {
    console.error("💥 [baselinker-sync] Fatal exception:", error);
    return NextResponse.json(
      { error: error.message || "Internal network syncing failure" },
      { status: 500 },
    );
  }
}
