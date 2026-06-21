// utils/d1/product/deleteProduct.ts

import { executeQuery } from "../execute";
import type { D1Database } from "@cloudflare/workers-types";

export type AllowedProductLookupFields =
  | "id"
  | "slug"
  | "sku"
  | "ean"
  | "asin"
  | "baselinker_id"
  | "shopify_id";

/**
 * Delete a product by any unique identifier field.
 *
 * IMPORTANT: This leverages database-level CASCADE DELETE.
 * When a product is deleted from the 'products' table, all related records in:
 * - product_paragraphs
 * - product_features
 * - product_images
 * - product_feedbacks
 * will be automatically deleted by the database due to FOREIGN KEY constraints
 * defined with ON DELETE CASCADE in the schema.
 *
 * No manual cleanup of child tables is needed.
 *
 * @param field - Validated field name ('id', 'slug', 'sku', 'ean', 'asin', 'baselinker_id', 'shopify_id')
 * @param value - The value to match
 * @param db - D1Database instance (required)
 * @returns Object with success boolean and number of rows affected (should be 1 if deleted)
 */
const deleteProductByField = async (
  field: AllowedProductLookupFields,
  value: string,
  db: D1Database,
): Promise<{ success: boolean; changes: number }> => {
  // Single DELETE statement - cascading handled automatically by D1
  const sql = `DELETE FROM products WHERE ${field} = ?`;
  const result = await executeQuery(sql, [value], db);

  // result.changes will be 1 if a product was deleted, 0 if no product matched
  return { success: true, changes: result.changes || 0 };
};

// --- Convenience typed wrappers for each identifier ---

export const deleteProductById = (id: string, db: D1Database) =>
  deleteProductByField("id", id, db);

export const deleteProductBySlug = (slug: string, db: D1Database) =>
  deleteProductByField("slug", slug, db);

export const deleteProductBySku = (sku: string, db: D1Database) =>
  deleteProductByField("sku", sku, db);

export const deleteProductByEan = (ean: string, db: D1Database) =>
  deleteProductByField("ean", ean, db);

export const deleteProductByAsin = (asin: string, db: D1Database) =>
  deleteProductByField("asin", asin, db);

export const deleteProductByBaselinkerId = (
  baselinkerId: string,
  db: D1Database,
) => deleteProductByField("baselinker_id", baselinkerId, db);

export const deleteProductByShopifyId = (shopifyId: string, db: D1Database) =>
  deleteProductByField("shopify_id", shopifyId, db);
