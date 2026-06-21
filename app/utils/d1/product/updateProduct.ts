// utils/d1/product/updateProduct.ts

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

export interface ProductUpdatePayload {
  slug?: string;
  title?: string;
  sku?: string;
  ean?: string;
  asin?: string;
  baselinker_id?: string;
  shopify_id?: string;
  category?: string;
  condition?: string;
  note?: string;
}

/**
 * Update a product by a validated unique identifier field.
 * @param field - The identifier field (id, slug, sku, etc.)
 * @param value - The value of the identifier
 * @param updates - Object containing the fields to update
 * @param db - D1Database instance (required, must be passed from the caller)
 */
const updateProductByField = async (
  field: AllowedProductLookupFields,
  value: string,
  updates: ProductUpdatePayload,
  db: D1Database,
): Promise<{ success: boolean; changes: number }> => {
  const updateFields = Object.keys(updates);

  // If no fields to update, return early
  if (updateFields.length === 0) {
    return { success: true, changes: 0 };
  }

  // Build the SET clause dynamically using parameterized binds
  const setClause = updateFields.map((field) => `${field} = ?`).join(", ");

  // Parameters: SET values followed by the WHERE lookup value
  const values = [...Object.values(updates), value];

  // unixepoch() executes inside D1's runtime, leaving our variable alignment intact
  const sql = `UPDATE products SET ${setClause}, updated_at = unixepoch() WHERE ${field} = ?`;

  // Pass the `db` instance to executeQuery
  const result = await executeQuery(sql, values, db);
  return { success: true, changes: result.changes || 0 };
};

// --- Convenience typed wrappers for each identifier ---

export const updateProductById = (
  id: string,
  updates: ProductUpdatePayload,
  db: D1Database,
) => updateProductByField("id", id, updates, db);

export const updateProductBySlug = (
  slug: string,
  updates: ProductUpdatePayload,
  db: D1Database,
) => updateProductByField("slug", slug, updates, db);

export const updateProductBySku = (
  sku: string,
  updates: ProductUpdatePayload,
  db: D1Database,
) => updateProductByField("sku", sku, updates, db);

export const updateProductByEan = (
  ean: string,
  updates: ProductUpdatePayload,
  db: D1Database,
) => updateProductByField("ean", ean, updates, db);

export const updateProductByAsin = (
  asin: string,
  updates: ProductUpdatePayload,
  db: D1Database,
) => updateProductByField("asin", asin, updates, db);

export const updateProductByBaselinkerId = (
  baselinkerId: string,
  updates: ProductUpdatePayload,
  db: D1Database,
) => updateProductByField("baselinker_id", baselinkerId, updates, db);

export const updateProductByShopifyId = (
  shopifyId: string,
  updates: ProductUpdatePayload,
  db: D1Database,
) => updateProductByField("shopify_id", shopifyId, updates, db);
