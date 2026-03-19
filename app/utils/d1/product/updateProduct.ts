import { executeQuery } from "../execute/executeQuery";

/**
 * Update a product by any unique identifier field.
 * @param field - Field name ('id', 'slug', 'sku', 'ean', 'asin', 'baselinker_id', 'shopify_id')
 * @param value - The value to match
 * @param updates - Object containing the fields to update
 * @returns Object with success boolean and number of rows affected (should be 1 if updated)
 */
export const updateProductByField = async (
  field: string,
  value: string,
  updates: Partial<{
    slug: string;
    title: string;
    sku: string;
    ean: string;
    asin: string;
    baselinker_id: string;
    shopify_id: string;
    category: string;
    condition: string;
    note: string;
  }>,
): Promise<{ success: boolean; changes: number }> => {
  // Get the keys of the updates object
  const updateFields = Object.keys(updates);

  // If no fields to update, return early
  if (updateFields.length === 0) {
    return { success: true, changes: 0 };
  }

  // Build the SET clause dynamically
  const setClause = updateFields.map((field) => `${field} = ?`).join(", ");

  // Build the values array: first the update values, then the WHERE value
  const values = [...Object.values(updates), value];

  // Add updated_at timestamp to the updates
  const sql = `UPDATE products SET ${setClause}, updated_at = unixepoch() WHERE ${field} = ?`;

  const result = await executeQuery(sql, values);
  return { success: true, changes: result.changes || 0 };
};

// Convenience wrappers for each identifier
export const updateProductById = (
  id: string,
  updates: Parameters<typeof updateProductByField>[2],
) => updateProductByField("id", id, updates);

export const updateProductBySlug = (
  slug: string,
  updates: Parameters<typeof updateProductByField>[2],
) => updateProductByField("slug", slug, updates);

export const updateProductBySku = (
  sku: string,
  updates: Parameters<typeof updateProductByField>[2],
) => updateProductByField("sku", sku, updates);

export const updateProductByEan = (
  ean: string,
  updates: Parameters<typeof updateProductByField>[2],
) => updateProductByField("ean", ean, updates);

export const updateProductByAsin = (
  asin: string,
  updates: Parameters<typeof updateProductByField>[2],
) => updateProductByField("asin", asin, updates);

export const updateProductByBaselinkerId = (
  baselinkerId: string,
  updates: Parameters<typeof updateProductByField>[2],
) => updateProductByField("baselinker_id", baselinkerId, updates);

export const updateProductByShopifyId = (
  shopifyId: string,
  updates: Parameters<typeof updateProductByField>[2],
) => updateProductByField("shopify_id", shopifyId, updates);

// Update by ID (most common)
// Update a product's title and note using its ID
// const result = await updateProductById('123e4567-e89b-12d3-a456-426614174000', {
//   title: 'New and Improved Gadget',
//   note: 'This product is now even better!'
// });

// console.log(result); // { success: true, changes: 1 }
// Update by SKU
// Change the category of a product identified by its SKU
// const result = await updateProductBySku('AG-123', {
//   category: 'smart-home',
//   condition: 'Refurbished'
// });

// console.log(result.changes); // 1 if product was found and updated
// Update by ASIN
// Update the eBay link (baselinker_id) and title for a product with a given ASIN
// const result = await updateProductByAsin('B08N5WRWNW', {
//   baselinker_id: 'ebay_98765',
//   title: 'Updated Title for Amazon Listing'
// });

// if (result.changes === 0) {
//   console.log('No product found with that ASIN');
// }
// Update by EAN
// Set a note for a product using its EAN
// await updateProductByEan('5901234123457', {
//   note: 'Check stock before listing'
// });
// Update multiple fields at once

// Update several fields for a product by ID
// await updateProductById('prod-001', {
//   slug: 'new-url-slug',
//   title: 'Completely Renamed Product',
//   sku: 'NEW-SKU-456',
//   note: 'Rebranded product line'
// });
