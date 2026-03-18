import { executeQuery } from "./client";

export class Transaction {
  statements: Array<{ sql: string; params: any[] }>;
  productId: string | null = null;

  constructor() {
    this.statements = [];
  }

  async createProduct(data: {
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
  }) {
    this.productId = data.id;
    const now = Math.floor(Date.now() / 1000);
    const sql = `
      INSERT INTO products (
        id, slug, title, sku, ean, asin, baselinker_id, shopify_id,
        category, condition, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.slug,
      data.title,
      data.sku || null,
      data.ean || null,
      data.asin || null,
      data.baselinker_id || null,
      data.shopify_id || null,
      data.category,
      data.condition || null,
      data.note || null,
      now,
      now,
    ];
    this.statements.push({ sql, params });
  }

  async addParagraphs(productId: string, paragraphs: string[]) {
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < paragraphs.length; i++) {
      const sql = `INSERT INTO product_paragraphs (product_id, paragraph_order, content, created_at) VALUES (?, ?, ?, ?)`;
      const params = [productId, i, paragraphs[i], now];
      this.statements.push({ sql, params });
    }
  }

  async addFeatures(
    productId: string,
    features: Array<{ title: string; description: string }>,
  ) {
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const sql = `INSERT INTO product_features (product_id, feature_order, title, description, created_at) VALUES (?, ?, ?, ?, ?)`;
      const params = [productId, i, f.title, f.description, now];
      this.statements.push({ sql, params });
    }
  }

  async addImages(
    productId: string,
    images: Array<{
      url: string;
      s3_path?: string;
      alt_text?: string;
      warnings?: string | null;
    }>,
  ) {
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const sql = `INSERT INTO product_images (product_id, image_order, url, s3_path, alt_text, warnings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const params = [
        productId,
        i,
        img.url,
        img.s3_path || null,
        img.alt_text || null,
        img.warnings || null,
        now,
      ];
      this.statements.push({ sql, params });
    }
  }

  async addFeedbacks(
    productId: string,
    feedbacks: Array<{ name: string; count: number; content: string }>,
  ) {
    const now = Math.floor(Date.now() / 1000);
    for (const fb of feedbacks) {
      const sql = `INSERT INTO product_feedbacks (product_id, name, count, content, created_at) VALUES (?, ?, ?, ?, ?)`;
      const params = [productId, fb.name, fb.count || 0, fb.content, now];
      this.statements.push({ sql, params });
    }
  }
}

export const transaction = async (
  callback: (tx: Transaction) => Promise<void>,
) => {
  const tx = new Transaction();
  await callback(tx);
  if (tx.statements.length === 0) return [];

  const results = [];
  for (const stmt of tx.statements) {
    try {
      const result = await executeQuery(stmt.sql, stmt.params);
      results.push(result);
    } catch (error) {
      if (tx.productId) {
        try {
          await executeQuery("DELETE FROM products WHERE id = ?", [
            tx.productId,
          ]);
          console.log(`🧹 Rolled back product ${tx.productId} due to error`);
        } catch (cleanupError) {
          console.error("Cleanup failed:", cleanupError);
        }
      }
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
  return results;
};
