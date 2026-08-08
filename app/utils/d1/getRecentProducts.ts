// utils/d1/getRecentProducts.ts

import { executeQuery } from "./execute";
import type { D1Database } from "@cloudflare/workers-types";

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

  const ensureArray = (value: any) => (Array.isArray(value) ? value : []);

  return {
    ...product,
    seo_sections: ensureArray(parse(product.seo_sections)),
    paragraphs: ensureArray(parse(product.paragraphs)),
    features: ensureArray(parse(product.features)),
    images: ensureArray(parse(product.images)),
    feedbacks: ensureArray(parse(product.feedbacks)),
    specifications: ensureArray(parse(product.specifications)), // <-- ADDED
    category_keywords: ensureArray(parse(product.category_keywords_json)),
    condition_options: ensureArray(parse(product.condition_options)),
  };
};

export type IdentifierField =
  | "baselinker_id"
  | "shopify_id"
  | "asin"
  | "ean"
  | "note";
export type IdentifierRule = "required" | "forbidden" | "ignored";

export interface CountFilter {
  min?: number;
  max?: number;
}

export interface CountFiltersType {
  image_count?: CountFilter;
  specs_count?: CountFilter;
  paragraphs_count?: CountFilter;
  features_count?: CountFilter;
  feedbacks_count?: CountFilter;
}

export const getRecentProducts = async (options: {
  limit?: number;
  offset?: number;
  order?: "DESC" | "ASC";
  category?: string;
  sortBy?: "created_at" | "updated_at";
  identifierRules?: Partial<Record<IdentifierField, IdentifierRule>>;
  countFilters?: CountFiltersType;
  db: D1Database;
  draft?: boolean;
}) => {
  const {
    limit = 10,
    offset = 0,
    order = "DESC",
    category,
    sortBy = "updated_at",
    identifierRules = {},
    countFilters = {},
    db,
    draft,
  } = options;

  let query = `SELECT * FROM v_product_complete`;
  const params: any[] = [];

  const conditions: string[] = [];

  if (category) {
    conditions.push(`category_slug = ?`);
    params.push(category);
  }
  if (draft) {
    conditions.push(
      `(image_count = 0 OR features_count = 0 OR paragraphs_count = 0)`,
    );
  }
  for (const [field, rule] of Object.entries(identifierRules)) {
    if (rule === "required") {
      conditions.push(`(${field} IS NOT NULL AND ${field} != '')`);
    } else if (rule === "forbidden") {
      conditions.push(`(${field} IS NULL OR ${field} = '')`);
    }
  }

  const countFieldMap: Record<keyof CountFiltersType, string> = {
    image_count: "image_count",
    specs_count: "specs_count",
    paragraphs_count: "paragraphs_count",
    features_count: "features_count",
    feedbacks_count: "feedbacks_count",
  };

  for (const [field, filter] of Object.entries(countFilters) as [
    keyof CountFiltersType,
    CountFilter,
  ][]) {
    const column = countFieldMap[field];
    if (filter.min !== undefined && filter.min !== null && !isNaN(filter.min)) {
      conditions.push(`${column} >= ?`);
      params.push(filter.min);
    }
    if (filter.max !== undefined && filter.max !== null && !isNaN(filter.max)) {
      conditions.push(`${column} <= ?`);
      params.push(filter.max);
    }
  }

  if (conditions.length) {
    query += ` WHERE ` + conditions.join(" AND ");
  }

  query += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  try {
    const results = await executeQuery(query, params, db);
    const parsedProducts = (results || []).map((row) => parseProductJson(row));
    return parsedProducts;
  } catch (error) {
    console.error(`[getRecentProducts] ❌ Error:`, error);
    throw error;
  }
};
