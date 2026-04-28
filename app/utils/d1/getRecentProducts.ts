import { executeQuery } from "./execute/executeQuery";

// Helper to parse all JSON fields returned by v_product_complete
const parseProductJson = (product: any) => {
  if (!product) return null;

  const parse = (field: any) => {
    if (typeof field === "string") {
      try {
        return JSON.parse(field);
      } catch {
        return field;
      }
    }
    return field;
  };

  return {
    ...product,
    seo_sections: parse(product.seo_sections) || [],
    paragraphs: parse(product.paragraphs) || [],
    features: parse(product.features) || [],
    images: parse(product.images) || [],
    feedbacks: parse(product.feedbacks) || [],
    category_keywords: parse(product.category_keywords_json) || [],
    condition_options: parse(product.condition_options) || [],
    // Optionally reconstruct condition group if needed later
  };
};

export const getRecentProducts = async (
  options: {
    limit?: number;
    offset?: number;
    order?: "DESC" | "ASC";
    category?: string;
    sortBy?: "created_at" | "updated_at";
  } = {},
) => {
  const {
    limit = 10,
    offset = 0,
    order = "DESC",
    category,
    sortBy = "updated_at",
  } = options;

  let query = `SELECT * FROM v_product_complete`;
  const params: any[] = [];

  if (category) {
    query += ` WHERE category_slug = ?`;
    params.push(category);
  }

  query += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const results = await executeQuery(query, params);
  return (results || []).map(parseProductJson);
};
