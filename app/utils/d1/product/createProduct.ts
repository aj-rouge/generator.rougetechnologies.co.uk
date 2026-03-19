import { executeQuery } from "../execute/executeQuery";

/**
 * Create a full product including all related arrays.
 * This runs multiple INSERT statements sequentially.
 * If any insert fails, an error is thrown and the process stops.
 * (For production you might want to wrap in a transaction, but this keeps it simple.)
 */
export const createFullProduct = async (product: {
  // Main product fields
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

  // Related arrays (optional)
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
  const now = Math.floor(Date.now() / 1000); // current Unix timestamp

  // 1. Insert the main product
  const mainSql = `
    INSERT INTO products (
      id, slug, title, sku, ean, asin, baselinker_id, shopify_id,
      category, condition, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const mainParams = [
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
  ];
  await executeQuery(mainSql, mainParams);

  // 2. Insert features (if any)
  if (product.features && product.features.length > 0) {
    for (let i = 0; i < product.features.length; i++) {
      const feature = product.features[i];
      await executeQuery(
        `INSERT INTO product_features (product_id, feature_order, title, description, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [product.id, i, feature.title, feature.description, now],
      );
    }
  }

  // 3. Insert paragraphs (if any)
  if (product.paragraphs && product.paragraphs.length > 0) {
    for (let i = 0; i < product.paragraphs.length; i++) {
      await executeQuery(
        `INSERT INTO product_paragraphs (product_id, paragraph_order, content, created_at)
         VALUES (?, ?, ?, ?)`,
        [product.id, i, product.paragraphs[i], now],
      );
    }
  }

  // 4. Insert images (if any)
  if (product.images && product.images.length > 0) {
    for (let i = 0; i < product.images.length; i++) {
      const img = product.images[i];
      await executeQuery(
        `INSERT INTO product_images (product_id, image_order, url, s3_path, alt_text, warnings, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          i,
          img.url,
          img.s3_path || null,
          img.alt_text || null,
          img.warnings || null,
          now,
        ],
      );
    }
  }

  // 5. Insert feedbacks (if any)
  if (product.feedbacks && product.feedbacks.length > 0) {
    for (const feedback of product.feedbacks) {
      await executeQuery(
        `INSERT INTO product_feedbacks (product_id, name, count, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [product.id, feedback.name, feedback.count || 0, feedback.content, now],
      );
    }
  }

  return { success: true, id: product.id };
};

// const newProduct = {
//   id: '123e4567-e89b-12d3-a456-426614174000',
//   slug: 'awesome-gadget',
//   title: 'Awesome Gadget',
//   sku: 'AG-123',
//   category: 'electronics',
//   condition: 'New',
//   features: [
//     { title: 'Fast', description: 'Really fast processor' },
//     { title: 'Light', description: 'Weighs only 200g' }
//   ],
//   paragraphs: [
//     'This gadget will change your life.',
//     'It comes in three colors.'
//   ],
//   images: [
//     { url: 'https://example.com/img1.jpg', alt_text: 'Front view' },
//     { url: 'https://example.com/img2.jpg', alt_text: 'Back view' }
//   ],
//   feedbacks: [
//     { name: 'John', content: 'Love it!', count: 5 }
//   ]
// };

// await createFullProduct(newProduct);
