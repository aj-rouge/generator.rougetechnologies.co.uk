// utils/d1/createFullProduct.ts

import { executeBatch } from "../execute";

export const createFullProduct = async (product: {
  id: string;
  slug: string;
  title: string;
  sku?: string;
  ean?: string;
  asin?: string;
  baselinker_id?: string;
  shopify_id?: string;
  category: string;
  condition?: string;
  note?: string;
  features?: Array<{ title: string; description: string }>;
  paragraphs?: string[];
  images?: Array<{
    url: string;
    s3_path?: string;
    alt_text?: string;
    warnings?: string;
  }>;
  feedbacks?: Array<{ name: string; content: string; count?: number }>;
}): Promise<{ success: boolean; id: string }> => {
  const now = Math.floor(Date.now() / 1000);

  // This queue will hold all queries to execute at once
  const queue: Array<{ sql: string; params: any[] }> = [];

  // 1. Queue Main Product Insert
  queue.push({
    sql: `
      INSERT INTO products (
        id, slug, title, sku, ean, asin, baselinker_id, shopify_id,
        category, condition, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      product.id,
      product.slug,
      product.title,
      product.sku || null,
      product.ean || null,
      product.asin || null,
      product.baselinker_id || null,
      product.shopify_id || null,
      product.category,
      product.condition || null,
      product.note || null,
      now,
      now,
    ],
  });

  // 2. Queue Features
  if (product.features && product.features.length > 0) {
    product.features.forEach((feature, i) => {
      queue.push({
        sql: `INSERT INTO product_features (product_id, feature_order, title, description, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        params: [product.id, i, feature.title, feature.description, now],
      });
    });
  }

  // 3. Queue Paragraphs
  if (product.paragraphs && product.paragraphs.length > 0) {
    product.paragraphs.forEach((paragraph, i) => {
      queue.push({
        sql: `INSERT INTO product_paragraphs (product_id, paragraph_order, content, created_at)
              VALUES (?, ?, ?, ?)`,
        params: [product.id, i, paragraph, now],
      });
    });
  }

  // 4. Queue Images
  if (product.images && product.images.length > 0) {
    product.images.forEach((img, i) => {
      queue.push({
        sql: `INSERT INTO product_images (product_id, image_order, url, s3_path, alt_text, warnings, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [
          product.id,
          i,
          img.url,
          img.s3_path || null,
          img.alt_text || null,
          img.warnings || null,
          now,
        ],
      });
    });
  }

  // 5. Queue Feedbacks
  if (product.feedbacks && product.feedbacks.length > 0) {
    product.feedbacks.forEach((feedback) => {
      queue.push({
        sql: `INSERT INTO product_feedbacks (product_id, name, count, content, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        params: [
          product.id,
          feedback.name,
          feedback.count || 0,
          feedback.content,
          now,
        ],
      });
    });
  }

  // Execute all statements safely inside a single transaction roundtrip
  await executeBatch(queue);

  return { success: true, id: product.id };
};
