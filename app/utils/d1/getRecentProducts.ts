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

/**
 * Fetch recent products with optional filters and sorting.
 * @param options - Configuration options; requires `db` instance.
 */
export const getRecentProducts = async (options: {
  limit?: number;
  offset?: number;
  order?: "DESC" | "ASC";
  category?: string;
  sortBy?: "created_at" | "updated_at";
  identifierRules?: Partial<Record<IdentifierField, IdentifierRule>>;
  countFilters?: CountFiltersType;
  db: D1Database; // <-- now required
}) => {
  const {
    limit = 10,
    offset = 0,
    order = "DESC",
    category,
    sortBy = "updated_at",
    identifierRules = {},
    countFilters = {},
    db, // <-- required
  } = options;

  // Optional: you can keep the test query for debugging, but now it uses `db`
  const test = await executeQuery("SELECT 1 as test", [], db);
  console.log("[getRecentProducts] Test query result:", test);

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

  console.log(`[getRecentProducts] SQL: ${query}`);
  console.log(`[getRecentProducts] Params:`, params);

  try {
    console.log("[getRecentProducts] Calling executeQuery...");
    const results = await executeQuery(query, params, db); // <-- pass db
    console.log(
      "[getRecentProducts] executeQuery returned, raw results count:",
      results?.length,
    );

    // Log the first raw row (if any) to see structure
    if (results && results.length > 0) {
      console.log(
        "[getRecentProducts] First raw row (keys):",
        Object.keys(results[0]),
      );
      console.log(
        "[getRecentProducts] First raw row sample:",
        JSON.stringify(results[0]).slice(0, 300),
      );
    }

    // Parse each row individually with error catching
    const parsedProducts = (results || []).map((row, index) => {
      try {
        return parseProductJson(row);
      } catch (parseErr) {
        console.error(
          `[getRecentProducts] ❌ Parse error at index ${index}:`,
          parseErr,
        );
        console.error(`[getRecentProducts] Raw row:`, row);
        throw parseErr;
      }
    });

    console.log(
      `[getRecentProducts] Successfully parsed ${parsedProducts.length} products`,
    );
    return parsedProducts;
  } catch (error) {
    console.error(`[getRecentProducts] ❌ Fatal error after query:`, error);
    throw error;
  }
};
