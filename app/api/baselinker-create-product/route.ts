// app/api/baselinker-create-product/route.ts
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

    // ✅ Fetch product with form‑compatible transformation
    const product = await getProductById(productId, { transformToForm: true });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const category = await getCategoryDetails(product.selectedCategory);
    let baselinkerCategoryId = category?.baselinker_category_id;

    if (!baselinkerCategoryId) {
      console.warn(
        `Category "${product.selectedCategory}" has no baselinker_category_id. Using default: ${DEFAULT_BASELINKER_CATEGORY_ID}`,
      );
      baselinkerCategoryId = DEFAULT_BASELINKER_CATEGORY_ID;
    }

    // 🟢 HTML Description – generated from paragraphs & product_features (NOT specifications)
    const htmlDescription = await generateProductHTML(productId);

    const images = (product.images || []).map((img: any) => `url:${img.url}`);

    // 🟡 Baselinker Parameters – sourced from product_specifications table
    const features = (product.specifications || []).map((spec: any) => ({
      name: spec.key,
      value: spec.value,
    }));

    const payload: any = {
      storage_id: process.env.BASELINKER_STORAGE_ID || "bl_1",
      name: product.title,
      description: htmlDescription, // ← rich HTML content
      category_id: baselinkerCategoryId.toString(),
      images,
      features, // ← technical parameters
    };

    if (product.sku) payload.sku = product.sku;
    if (product.ean) payload.ean = product.ean;
    if (product.asin) payload.asin = product.asin;
    if (product.baselinker_id && product.baselinker_id !== "null") {
      payload.product_id = product.baselinker_id.toString();
    }

    // Default values – can be extended later
    payload.quantity = product.quantity || 0;
    payload.price_brutto = product.price_brutto || 0;
    payload.tax_rate = product.tax_rate || 23;
    payload.weight = product.weight || 0;

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

    // Save returned product_id if new
    if (!product.baselinker_id && result.product_id) {
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
      message: product.baselinker_id
        ? "Product updated in Baselinker"
        : "Product created in Baselinker",
      baselinker_product_id: result.product_id,
      warnings: result.warnings || {},
    });
  } catch (error: any) {
    console.error("Baselinker Create Product Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
