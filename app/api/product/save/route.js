import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../../utils/d1/db";
import { ImageService } from "../../../utils/images/productImageService";
import { upsertProductData } from "../../../utils/d1/productRepo";
import { getProductBySlug } from "../../../utils/d1/product/getProductBySlug";

export async function POST(req) {
  try {
    const newData = await req.json();
    console.log("Incoming newData:", JSON.stringify(newData, null, 2));
    if (newData.ean === "null") newData.ean = null;
    const productSlug = newData.slug.split("/").pop();
    const categorySlug = newData.slug.split("/")[0]; // e.g., "laptops"
    newData.category = categorySlug;
    // 1. Check existing
    const existing = await getProductBySlug(productSlug);
    const productId = existing?.id || uuidv4();

    // 2. Image Orchestration
    if (existing?.images) {
      await ImageService.moveExistingToTemp(productSlug, existing.images);
    }

    const finalizedImages = await ImageService.processImages(
      newData.images || [],
      newData.category,
      productSlug,
      existing?.images || [],
    );

    // 3. Database Sync
    await upsertProductData(
      productId,
      { ...newData, slug: productSlug },
      finalizedImages,
      !!existing,
    );

    // 4. Cleanup S3
    await ImageService.cleanup(newData.category, productSlug, finalizedImages);

    return NextResponse.json({
      success: true,
      id: productId,
      message: "Product synced successfully",
    });
  } catch (error) {
    console.error("💥 Save Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
