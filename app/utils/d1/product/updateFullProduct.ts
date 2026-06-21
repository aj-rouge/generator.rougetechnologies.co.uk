import { executeBatch } from "../execute";

/**
 * Replace an entire product and all its child records.
 * This is a full update – it deletes all existing features, paragraphs, images,
 * and feedbacks for the product, then inserts the new ones provided.
 * The operation is atomic: either everything succeeds, or nothing changes.
 *
 * @param product - Complete product object (must contain id and all fields,
 *                  including empty arrays for child data if none exist)
 * @returns Success indicator and product id
 *
 * @example
 * const product = await getProductById('123');
 * product.title = 'Updated Title';
 * product.features.push({ title: 'New feature', description: '...' });
 * await updateFullProduct(product);
 */
export const updateFullProduct = async (product: {
  id: string;
  slug: string;
  title: string;
  sku?: string | null;
  ean?: string | null;
  asin?: string | null;
  baselinker_id?: string | null;
  shopify_id?: string | null;
  category: string;
  condition?: string | null;
  note?: string | null;
  features: Array<{ title: string; description: string }>;
  paragraphs: string[];
  images: Array<{
    url: string;
    s3_path?: string | null;
    alt_text?: string | null;
    warnings?: string | null;
  }>;
  feedbacks: Array<{ name: string; content: string; count?: number }>;
}): Promise<{ success: boolean; id: string }> => {
  const now = Math.floor(Date.now() / 1000); // current Unix timestamp
  const queries = [];

  // 1. Update the main product row
  queries.push({
    sql: `
      UPDATE products SET
        slug = ?, title = ?, sku = ?, ean = ?, asin = ?,
        baselinker_id = ?, shopify_id = ?, category = ?,
        condition = ?, note = ?, updated_at = ?
      WHERE id = ?
    `,
    params: [
      product.slug,
      product.title,
      product.sku ?? null,
      product.ean ?? null,
      product.asin ?? null,
      product.baselinker_id ?? null,
      product.shopify_id ?? null,
      product.category,
      product.condition ?? null,
      product.note ?? null,
      now,
      product.id,
    ],
  });

  // 2. Delete all existing child records for this product
  queries.push({
    sql: `DELETE FROM product_features WHERE product_id = ?`,
    params: [product.id],
  });
  queries.push({
    sql: `DELETE FROM product_paragraphs WHERE product_id = ?`,
    params: [product.id],
  });
  queries.push({
    sql: `DELETE FROM product_images WHERE product_id = ?`,
    params: [product.id],
  });
  queries.push({
    sql: `DELETE FROM product_feedbacks WHERE product_id = ?`,
    params: [product.id],
  });

  // 3. Insert new features (if any)
  if (product.features && product.features.length > 0) {
    product.features.forEach((feat, index) => {
      queries.push({
        sql: `
          INSERT INTO product_features (product_id, feature_order, title, description, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [product.id, index, feat.title, feat.description, now],
      });
    });
  }

  // 4. Insert new paragraphs (if any)
  if (product.paragraphs && product.paragraphs.length > 0) {
    product.paragraphs.forEach((para, index) => {
      queries.push({
        sql: `
          INSERT INTO product_paragraphs (product_id, paragraph_order, content, created_at)
          VALUES (?, ?, ?, ?)
        `,
        params: [product.id, index, para, now],
      });
    });
  }

  // 5. Insert new images (if any)
  if (product.images && product.images.length > 0) {
    product.images.forEach((img, index) => {
      queries.push({
        sql: `
          INSERT INTO product_images (product_id, image_order, url, s3_path, alt_text, warnings, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          product.id,
          index,
          img.url,
          img.s3_path ?? null,
          img.alt_text ?? null,
          img.warnings ?? null,
          now,
        ],
      });
    });
  }

  // 6. Insert new feedbacks (if any)
  if (product.feedbacks && product.feedbacks.length > 0) {
    product.feedbacks.forEach((fb) => {
      queries.push({
        sql: `
          INSERT INTO product_feedbacks (product_id, name, count, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [product.id, fb.name, fb.count ?? 0, fb.content, now],
      });
    });
  }

  // Execute all queries in one batch (atomic transaction)
  await executeBatch(queries);

  return { success: true, id: product.id };
};
