// app/utils/d1/productRepo.ts
import { db } from "./db";

export async function upsertProductData(
  productId: string,
  data: any,
  finalizedImages: any[],
  isUpdate: boolean,
): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Prepare only the columns that exist in the 'products' table
    const productPayload = {
      slug: data.slug,
      title: data.title,
      sku: data.sku || null,
      ean: data.ean || null,
      asin: data.asin || null,
      baselinker_id: data.baselinker_id || null,
      shopify_id: data.shopify_id || null,
      category: data.category,
      condition: data.condition || null,
      note: data.note || null,
    };
    console.log("Update payload:", productPayload);
    if (isUpdate) {
      console.log(`🧹 Cleaning relations for product: ${productId}`);

      // --- STEP 1: DELETE CHILDREN FIRST ---
      // This removes the Foreign Key links so the parent can be updated freely
      await db.execute(`DELETE FROM product_paragraphs WHERE product_id = ?`, [
        productId,
      ]);
      await db.execute(`DELETE FROM product_features WHERE product_id = ?`, [
        productId,
      ]);
      await db.execute(`DELETE FROM product_images WHERE product_id = ?`, [
        productId,
      ]);
      await db.execute(`DELETE FROM product_feedbacks WHERE product_id = ?`, [
        productId,
      ]);

      // --- STEP 2: UPDATE PARENT ---
      console.log(`📝 Updating parent product: ${productId}`);
      await db.productsNew.update(productId, productPayload);
    } else {
      // CREATE MODE: Add the ID for new records
      await db.productsNew.create({ ...productPayload, id: productId });
    }

    // --- STEP 3: RE-INSERT RELATIONS ---
    // Now that the parent exists (or is updated), we link the new children
    console.log(`🔗 Re-linking relations for product: ${productId}`);

    if (data.paragraphs?.length)
      await db.productsNew.addParagraphs(productId, data.paragraphs);
    if (data.features?.length)
      await db.productsNew.addFeatures(productId, data.features);
    if (finalizedImages.length)
      await db.productsNew.addImages(productId, finalizedImages);
    if (data.feedbacks?.length)
      await db.productsNew.addFeedbacks(productId, data.feedbacks);
  });
}
