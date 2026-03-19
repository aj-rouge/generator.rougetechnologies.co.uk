import { executeQuery } from "../execute/executeQuery";

/**
 * Delete a product by any unique identifier field.
 *
 * IMPORTANT: This leverages database-level CASCADE DELETE.
 * When a product is deleted from the 'products' table, all related records in:
 *   - product_paragraphs
 *   - product_features
 *   - product_images
 *   - product_feedbacks
 * will be automatically deleted by the database due to FOREIGN KEY constraints
 * defined with ON DELETE CASCADE in the schema.
 *
 * No manual cleanup of child tables is needed.
 *
 * @param field - Field name ('id', 'slug', 'sku', 'ean', 'asin', 'baselinker_id', 'shopify_id')
 * @param value - The value to match
 * @returns Object with success boolean and number of rows affected (should be 1 if deleted)
 *
 * @requires PRAGMA foreign_keys = ON; - Must be enabled for cascading to work
 * @see schema.sql - See FOREIGN KEY definitions with ON DELETE CASCADE
 */
export const deleteProductByField = async (
  field: string,
  value: string,
): Promise<{ success: boolean; changes: number }> => {
  // Single DELETE statement - cascading handled automatically by the database
  // because child tables reference products.id with ON DELETE CASCADE
  const sql = `DELETE FROM products WHERE ${field} = ?`;
  const result = await executeQuery(sql, [value]);

  // result.changes will be 1 if a product was deleted, 0 if no product matched the criteria
  // Even though child records may be deleted (cascade), changes only reflects the main product delete
  return { success: true, changes: result.changes || 0 };
};

// Convenience wrappers for each identifier
// These all use the same cascading delete behavior
export const deleteProductById = (id: string) => deleteProductByField("id", id);
export const deleteProductBySlug = (slug: string) =>
  deleteProductByField("slug", slug);
export const deleteProductBySku = (sku: string) =>
  deleteProductByField("sku", sku);
export const deleteProductByEan = (ean: string) =>
  deleteProductByField("ean", ean);
export const deleteProductByAsin = (asin: string) =>
  deleteProductByField("asin", asin);
export const deleteProductByBaselinkerId = (baselinkerId: string) =>
  deleteProductByField("baselinker_id", baselinkerId);
export const deleteProductByShopifyId = (shopifyId: string) =>
  deleteProductByField("shopify_id", shopifyId);
