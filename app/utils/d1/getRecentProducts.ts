import { executeQuery } from "./execute/executeQuery";

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
  };
};

export type IdentifierField =
  | "baselinker_id"
  | "shopify_id"
  | "asin"
  | "ean"
  | "note";
export type IdentifierRule = "required" | "forbidden" | "ignored";

export const getRecentProducts = async (
  options: {
    limit?: number;
    offset?: number;
    order?: "DESC" | "ASC";
    category?: string;
    sortBy?: "created_at" | "updated_at";
    identifierRules?: Partial<Record<IdentifierField, IdentifierRule>>;
  } = {},
) => {
  const {
    limit = 10,
    offset = 0,
    order = "DESC",
    category,
    sortBy = "updated_at",
    identifierRules = {},
  } = options;

  let query = `SELECT * FROM v_product_complete`;
  const params: any[] = [];

  const conditions: string[] = [];

  if (category) {
    conditions.push(`category_slug = ?`);
    params.push(category);
  }

  for (const [field, rule] of Object.entries(identifierRules)) {
    if (rule === "required") {
      conditions.push(`(${field} IS NOT NULL AND ${field} != '')`);
    } else if (rule === "forbidden") {
      conditions.push(`(${field} IS NULL OR ${field} = '')`);
    }
    // "ignored" adds nothing
  }

  if (conditions.length) {
    query += ` WHERE ` + conditions.join(" AND ");
  }

  query += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  console.log(`[getRecentProducts] SQL: ${query}`);
  console.log(`[getRecentProducts] Params:`, params);
  console.log(`[getRecentProducts] Filters:`, {
    category,
    identifierRules,
    sortBy,
    order,
    limit,
    offset,
  });

  const results = await executeQuery(query, params);
  console.log(`[getRecentProducts] Fetched ${results?.length || 0} products`);
  return (results || []).map(parseProductJson);
};
