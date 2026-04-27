// app/api/baselinker-sync-product/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute/executeQuery";
import { getProductById } from "../../utils/d1/product/readProduct";
import { generateProductHTML } from "../../utils/htmlGenerator/generateProductHTML";

const DEFAULT_BASELINKER_CATEGORY_ID =
  process.env.BASELINKER_DEFAULT_CATEGORY_ID || "902373";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCategoryDetails(categorySlug: string) {
  const result = await executeQuery(
    `SELECT baselinker_category_id FROM categories WHERE slug = ?`,
    [categorySlug],
  );
  return result?.[0] || null;
}

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();

    if (!productId || productId === "null" || !UUID_REGEX.test(productId)) {
      return NextResponse.json(
        {
          error: `A valid product ID (UUID) is required. Received: ${productId}`,
        },
        { status: 400 },
      );
    }

    // Fetch product with form‑compatible transformation
    const product = await getProductById(productId, { transformToForm: true });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Determine Baselinker category ID
    const category = await getCategoryDetails(product.selectedCategory);
    let baselinkerCategoryId = category?.baselinker_category_id;
    if (!baselinkerCategoryId) {
      console.warn(
        `Category "${product.selectedCategory}" has no baselinker_category_id. Using default: ${DEFAULT_BASELINKER_CATEGORY_ID}`,
      );
      baselinkerCategoryId = DEFAULT_BASELINKER_CATEGORY_ID;
    }

    // Generate HTML description (from paragraphs & product_features)
    const htmlDescription = await generateProductHTML(productId);

    // Prepare images array (Baselinker format: "url:https://...")
    const images = (product.images || []).map((img: any) => `url:${img.url}`);

    // Prepare features array from product_specifications
    const features = (product.specifications || []).map((spec: any) => ({
      name: spec.key,
      value: spec.value,
    }));

    // Add RRP as a separate feature if present
    if (product.rrp) {
      features.push({
        name: "RRP",
        value: `£${product.rrp}`,
      });
    }

    // Add shipping method as a feature if present
    if (product.shipping_method) {
      features.push({
        name: "Shipping method",
        value: product.shipping_method,
      });
    }

    // Determine if this is an update (product already exists in Baselinker)
    const isUpdate = product.baselinker_id && product.baselinker_id !== "null";

    // Build the base payload (always included fields)
    const payload: any = {
      storage_id: process.env.BASELINKER_STORAGE_ID || "bl_1",
      name: product.title,
      description: htmlDescription,
      category_id: baselinkerCategoryId.toString(),
      images,
      features,
      price_brutto:
        typeof product.price_brutto === "number"
          ? product.price_brutto
          : parseFloat(product.price_brutto) || 0,
    };

    // Optional fields that can be updated safely
    if (product.sku) payload.sku = String(product.sku);
    if (product.ean) payload.ean = String(product.ean);
    if (product.asin) payload.asin = String(product.asin);
    if (isUpdate) {
      payload.product_id = String(product.baselinker_id);
    }

    // 🚫 For updates: DO NOT send weight, tax_rate, quantity.
    // ✅ For new products: send all inventory/weight/VAT data.
    if (!isUpdate) {
      payload.quantity =
        typeof product.quantity === "number"
          ? product.quantity
          : Number(product.quantity) || 0;
      payload.tax_rate =
        typeof product.vat_rate === "number"
          ? product.vat_rate
          : parseFloat(product.vat_rate) || 0;
      payload.weight =
        typeof product.weight === "number"
          ? product.weight
          : parseFloat(product.weight) || 0;
    }

    // Call Baselinker API (method "addProduct" handles both create & update)
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

    const result = await response.json();

    if (result.status === "ERROR") {
      return NextResponse.json(
        { error: result.error_message || "Baselinker API error" },
        { status: 500 },
      );
    }

    // If this was a new product, save the returned baselinker_id in your DB
    if (!isUpdate && result.product_id) {
      await executeQuery(
        `UPDATE products SET baselinker_id = ?, updated_at = ? WHERE id = ?`,
        [
          result.product_id.toString(),
          Math.floor(Date.now() / 1000),
          productId,
        ],
      );
    }

    return NextResponse.json({
      success: true,
      message: isUpdate
        ? "Product fully updated in Baselinker (excluding stock, VAT, weight)"
        : "Product created in Baselinker",
      baselinker_product_id: result.product_id,
      warnings: result.warnings || {},
    });
  } catch (error: any) {
    console.error("Baselinker Sync Product Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
