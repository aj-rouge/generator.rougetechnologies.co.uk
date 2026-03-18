import { executeQuery } from "../client";

export const createProduct = async (data: {
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
}): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const sql = `
    INSERT INTO products (
      id, slug, title, sku, ean, asin, baselinker_id, shopify_id,
      category, condition, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await executeQuery(sql, [
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
  ]);

  return data.id;
};
export const getProductById = async (id: string): Promise<any | null> => {
  const results = await executeQuery(
    "SELECT * FROM v_product_full WHERE id = ?",
    [id],
  );
  if (!results || results.length === 0) return null;
  return parseProductJson(results[0]);
};



export const updateProduct = async (
  id: string,
  updates: Record<string, any>,
): Promise<void> => {
  const fields = Object.keys(updates)
    .filter((key) => key !== "id" && key !== "created_at")
    .map((key) => `${key} = ?`)
    .join(", ");

  const values = Object.keys(updates)
    .filter((key) => key !== "id" && key !== "created_at")
    .map((key) => updates[key]);

  const now = Math.floor(Date.now() / 1000);

  const sql = `UPDATE products SET ${fields}, updated_at = ? WHERE id = ?`;
  await executeQuery(sql, [...values, now, id]);
};

const parseProductJson = (product: any) => {
  if (!product) return null;
  return {
    ...product,
    paragraphs:
      typeof product.paragraphs === "string"
        ? JSON.parse(product.paragraphs)
        : product.paragraphs,
    features:
      typeof product.features === "string"
        ? JSON.parse(product.features)
        : product.features,
    images:
      typeof product.images === "string"
        ? JSON.parse(product.images)
        : product.images,
    feedbacks:
      typeof product.feedbacks === "string"
        ? JSON.parse(product.feedbacks)
        : product.feedbacks,
  };
};
// utils/d1/products.ts (partial – only the relevant functions)

export const getRecentlyUpdated = async (
  limit = 10,
  order: "DESC" | "ASC" = "DESC",
  category?: string,
) => {
  let query = `
    SELECT v.*, c.name as category_name
    FROM v_product_full v
    LEFT JOIN categories c ON v.category = c.slug
  `;
  const params: any[] = [];

  if (category) {
    query += ` WHERE v.category = ?`;
    params.push(category);
  }

  query += ` ORDER BY v.updated_at ${order} LIMIT ?`;
  params.push(limit);

  const results = await executeQuery(query, params);
  return (results || []).map(parseProductJson);
};

export const getRecentlyCreated = async (
  limit = 10,
  order: "DESC" | "ASC" = "DESC",
  category?: string,
) => {
  let query = `
    SELECT v.*, c.name as category_name
    FROM v_product_full v
    LEFT JOIN categories c ON v.category = c.slug
  `;
  const params: any[] = [];

  if (category) {
    query += ` WHERE v.category = ?`;
    params.push(category);
  }

  query += ` ORDER BY v.created_at ${order} LIMIT ?`;
  params.push(limit);

  const results = await executeQuery(query, params);
  return (results || []).map(parseProductJson);
};
