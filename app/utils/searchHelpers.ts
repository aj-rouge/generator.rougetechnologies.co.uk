import { Product } from "../types/types";
import { db } from "./d1/db";
import { detectSearchType, sanitizeFTSQuery } from "./search/recognize";

export async function searchWithFacets(
  query: string,
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  } = {},
): Promise<{
  results: Product[];
  facets: {
    categories: Array<{ name: string; count: number }>;
    totalResults: number;
  };
}> {
  const detection = detectSearchType(query);
  const ftsQuery = sanitizeFTSQuery(query);

  // Build filter conditions
  let filterConditions: string[] = [];
  let filterParams: any[] = [];

  if (filters.category) {
    filterConditions.push("p.category = ?");
    filterParams.push(filters.category);
  }

  // Execute search with facet counts
  const sql = `
    WITH search_results AS (
      SELECT 
        p.*,
        bm25(products_fts) as relevance_score
      FROM products p
      INNER JOIN products_fts ON p.rowid = products_fts.rowid
      WHERE products_fts MATCH ?
      ${filterConditions.length ? "AND " + filterConditions.join(" AND ") : ""}
      ORDER BY relevance_score ASC, p.created_at DESC
      LIMIT 100
    )
    SELECT 
      sr.*,
      (SELECT COUNT(*) FROM search_results) as total_count,
      (
        SELECT json_group_array(
          json_object('name', category, 'count', category_count)
        )
        FROM (
          SELECT category, COUNT(*) as category_count
          FROM search_results
          GROUP BY category
          ORDER BY category_count DESC
        )
      ) as category_facets
    FROM search_results sr
    ORDER BY sr.relevance_score ASC, sr.created_at DESC
  `;

  const result = await db.execute(sql, [ftsQuery, ...filterParams]);
  const rows = result.results || [];

  if (rows.length === 0) {
    return { results: [], facets: { categories: [], totalResults: 0 } };
  }

  const facets = {
    categories: JSON.parse(rows[0].category_facets || "[]"),
    totalResults: rows[0].total_count || 0,
  };

  // Populate relations for results
  const products = await db.populateProductsRelations(rows);

  return {
    results: products,
    facets,
  };
}

export async function findSimilarProducts(
  productId: string,
  limit: number = 5,
): Promise<Product[]> {
  // Get the product's features and category
  const product = await db.getProductById(productId, true);
  if (!product) return [];

  // Build a query from features and category
  const featureTerms = product.features
    ?.flatMap((f) => [f.title, f.description])
    .join(" ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 10)
    .join(" ");

  const searchQuery = `${product.category} ${featureTerms || ""}`;
  const ftsQuery = sanitizeFTSQuery(searchQuery);

  const sql = `
    SELECT 
      p.*,
      bm25(products_fts) as similarity_score
    FROM products p
    INNER JOIN products_fts ON p.rowid = products_fts.rowid
    WHERE products_fts MATCH ?
      AND p.id != ?
    ORDER BY similarity_score ASC
    LIMIT ?
  `;

  const result = await db.execute(sql, [ftsQuery, productId, limit]);
  const rows = result.results || [];

  // Populate relations
  return db.populateProductsRelations(rows);
}

export async function searchByImageSimilarity(
  imageUrl: string,
  limit: number = 10,
): Promise<Product[]> {
  // This would typically use image recognition
  // For now, search by image filename/alt text
  const fileName = imageUrl.split("/").pop()?.split(".")[0] || "";
  const searchTerms = fileName.split(/[-_]/).join(" ");

  const sql = `
    SELECT DISTINCT p.*
    FROM products p
    INNER JOIN product_images i ON p.id = i.product_id
    WHERE i.alt_text LIKE ? 
       OR i.url LIKE ?
       OR p.title LIKE ?
    ORDER BY p.updated_at DESC
    LIMIT ?
  `;

  const pattern = `%${searchTerms}%`;
  const result = await db.execute(sql, [pattern, pattern, pattern, limit]);
  const rows = result.results || [];

  // Populate relations
  return db.populateProductsRelations(rows);
}
