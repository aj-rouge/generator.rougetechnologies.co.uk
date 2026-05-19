// app/api/baselinker-sync-product/route.ts (cleaned up)
import { NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute/executeQuery";
import { getProductById } from "../../utils/d1/product/readProduct";
import { generateProductHTML } from "../../utils/htmlGenerator/generateProductHTML";

const DEFAULT_BASELINKER_CATEGORY_ID =
  process.env.BASELINKER_DEFAULT_CATEGORY_ID || "902373";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const storageId = process.env.BASELINKER_STORAGE_ID || "bl_1";
    console.log(`✅ Using storage_id: ${storageId}`);

    const { productId } = await req.json();
    if (!productId || !UUID_REGEX.test(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const product = await getProductById(productId, { transformToForm: true });
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (!product.title?.trim())
      return NextResponse.json(
        { error: "Product title missing" },
        { status: 400 },
      );

    const rawBaselinkerId = product.baselinker_id;
    const isUpdate =
      rawBaselinkerId &&
      rawBaselinkerId !== "null" &&
      rawBaselinkerId.trim() !== "";
    console.log(
      isUpdate ? `Updating ${rawBaselinkerId}` : "Creating new product",
    );

    if ((product.images?.length || 0) > 16) {
      return NextResponse.json(
        { error: "Too many images (max 16)" },
        { status: 400 },
      );
    }

    const htmlDescription = await generateProductHTML(productId);
    const images = product.images.map((img: any) => `url:${img.url}`);
    const features = (product.specifications || []).map((spec: any) => ({
      name: spec.key,
      value: spec.value,
    }));
    if (product.rrp) features.push({ name: "RRP", value: `£${product.rrp}` });
    if (product.shipping_method)
      features.push({
        name: "Shipping method",
        value: product.shipping_method,
      });

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
      const category = await executeQuery(
        `SELECT baselinker_category_id FROM categories WHERE slug = ?`,
        [product.selectedCategory],
      );
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

    const result = await response.json();
    if (result.status === "ERROR") {
      let userMessage = result.error_message;
      if (userMessage.includes("Product not found") && isUpdate) {
        await executeQuery(
          `UPDATE products SET baselinker_id = NULL WHERE id = ?`,
          [productId],
        );
        return NextResponse.json(
          { error: "Stale Baselinker ID cleared. Please click sync again." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: userMessage }, { status: 500 });
    }

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
      message: isUpdate ? "Product updated" : "Product created",
      baselinker_product_id: result.product_id,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
