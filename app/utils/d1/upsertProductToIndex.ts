import { db } from "./db";

export async function upsertProductToIndex(product: any) {
  // Validate required fields
  if (!product.slug || !product.title || !product.sku || !product.category) {
    throw new Error("Missing required fields for D1 indexing");
  }
  const now = Math.floor(Date.now() / 1000);
  const upsertSql = `
    INSERT OR REPLACE INTO products_search (
      slug, title, sku, ean, asin, baselinker_id, 
      shopify_id, category, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    product.slug,
    product.title,
    product.sku,
    product.ean || null,
    product.asin || null,
    product.baselinker_id || null,
    product.shopify_id || null,
    product.category,
    product.created_at || now, // created_at (only used on INSERT)
    now, // updated_at (used on INSERT and UPDATE)
  ];

  return await db.execute(upsertSql, params);
}
