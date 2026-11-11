// lib/analytics/brands.ts
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeBatch } from "../d1/execute";

// ---------- Shared CTE ----------
// Derives brand from data, not a hardcoded list.
// Priority: specs.brand_name/brand -> specs.manufacturer -> title first word.
// Adds brand_confidence so 'title_first_word' noise (like "4k") is filtered.
const BRAND_CTE = `
WITH brands_by_product AS (
  SELECT
    product_id,
    MIN(CASE WHEN LOWER(key) IN ('brand_name','brand')
        THEN NULLIF(LOWER(TRIM(value)), '') END) AS brand_specs,
    MIN(CASE WHEN LOWER(key) = 'manufacturer'
        THEN NULLIF(LOWER(TRIM(value)), '') END) AS brand_manufacturer
  FROM product_specifications
  WHERE LOWER(key) IN ('brand_name','brand','manufacturer')
  GROUP BY product_id
),
product_brand AS (
  SELECT
    p.id, p.sku, p.title, p.category,
    SUBSTR(p.sku, 1, INSTR(p.sku || '-', '-') - 1)                        AS sku_prefix,
    LENGTH(p.sku) - LENGTH(REPLACE(p.sku, '-', '')) + 1                   AS segment_count,
    LENGTH(SUBSTR(p.sku, 1, INSTR(p.sku || '-', '-') - 1))                AS prefix_len,
    b.brand_specs,
    b.brand_manufacturer,
    NULLIF(LOWER(TRIM(SUBSTR(p.title, 1, INSTR(p.title || ' ', ' ') - 1))), '') AS brand_title
  FROM products p
  LEFT JOIN brands_by_product b ON b.product_id = p.id
  WHERE p.sku IS NOT NULL AND TRIM(p.sku) != ''
),
brand_resolved AS (
  SELECT
    id, sku, title, category, sku_prefix, segment_count, prefix_len,
    COALESCE(brand_specs, brand_manufacturer, brand_title) AS brand,
    CASE
      WHEN brand_specs        IS NOT NULL THEN 'specs'
      WHEN brand_manufacturer IS NOT NULL THEN 'manufacturer'
      WHEN brand_title        IS NOT NULL THEN 'title_first_word'
      ELSE 'unknown'
    END AS brand_source
  FROM product_brand
),
brand_counts AS (
  SELECT brand, COUNT(*) AS total
  FROM brand_resolved
  WHERE brand IS NOT NULL
  GROUP BY brand
),
brand_final AS (
  SELECT
    br.*,
    bc.total AS brand_total,
    CASE
      WHEN br.brand_source IN ('specs','manufacturer') THEN 'authoritative'
      WHEN bc.total >= 3                                THEN 'high_confidence'
      ELSE 'low_confidence'
    END AS brand_confidence
  FROM brand_resolved br
  LEFT JOIN brand_counts bc ON bc.brand = br.brand
)
`;

const withCTE = (q: string) => `${BRAND_CTE}\n${q}`;

// ---------- Individual queries ----------

const SUMMARY_QUERY = `
SELECT
  (SELECT COUNT(*) FROM products)                                                     AS total_products,
  (SELECT COUNT(*) FROM brand_final WHERE brand IS NOT NULL)                          AS matched_products,
  (SELECT COUNT(DISTINCT brand) FROM brand_final
     WHERE brand IS NOT NULL AND brand_confidence != 'low_confidence')                AS distinct_brands,
  (SELECT COUNT(*) FROM brand_final WHERE brand_confidence = 'low_confidence')        AS noise_products,
  (SELECT COUNT(DISTINCT brand) FROM brand_final WHERE brand_confidence = 'low_confidence') AS noise_brands
`;

const SOURCE_BREAKDOWN_QUERY = `
SELECT
  brand_source,
  COUNT(*)                                                    AS products,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)          AS pct,
  COUNT(DISTINCT brand)                                       AS distinct_brands
FROM brand_final
WHERE brand IS NOT NULL
GROUP BY brand_source
ORDER BY products DESC
`;

const DRIFT_QUERY = `
SELECT
  brand,
  COUNT(*)                                                      AS distinct_prefixes,
  SUM(cnt)                                                      AS total_products,
  CASE
    WHEN SUM(cnt) >= 5 AND COUNT(*) >= 2 THEN 'high_confidence_drift'
    WHEN SUM(cnt) >= 2 AND COUNT(*) >= 2 THEN 'likely_drift'
    ELSE 'single_or_noise'
  END                                                           AS confidence,
  GROUP_CONCAT(sku_prefix || '(' || cnt || ')')                 AS prefixes
FROM (
  SELECT brand, sku_prefix, COUNT(*) AS cnt
  FROM brand_final
  WHERE brand IS NOT NULL AND brand_confidence != 'low_confidence'
  GROUP BY brand, sku_prefix
)
GROUP BY brand
HAVING COUNT(*) > 1
ORDER BY
  CASE confidence
    WHEN 'high_confidence_drift' THEN 1
    WHEN 'likely_drift'          THEN 2
    ELSE 3
  END,
  SUM(cnt) DESC
`;

const PREFIX_INVENTORY_QUERY = `
SELECT
  sku_prefix,
  COUNT(*)                              AS products,
  COUNT(DISTINCT brand)                 AS distinct_brands,
  COUNT(DISTINCT category)              AS distinct_categories,
  GROUP_CONCAT(DISTINCT brand)          AS brands_using,
  CASE
    WHEN COUNT(DISTINCT brand) > 1 THEN 'collision'
    WHEN COUNT(DISTINCT brand) = 1 THEN 'exclusive'
    ELSE 'unknown_brand'
  END                                   AS status
FROM brand_final
WHERE brand IS NOT NULL AND brand_confidence != 'low_confidence'
GROUP BY sku_prefix
ORDER BY products DESC
LIMIT 200
`;

const PREFIX_LENGTH_QUERY = `
SELECT
  prefix_len,
  COUNT(DISTINCT sku_prefix)                                   AS distinct_prefixes,
  COUNT(*)                                                     AS total_products,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)           AS pct
FROM brand_final
WHERE brand IS NOT NULL AND brand_confidence != 'low_confidence'
GROUP BY prefix_len
ORDER BY prefix_len
`;

const SEGMENT_COUNT_QUERY = `
SELECT
  segment_count,
  COUNT(DISTINCT sku_prefix) AS distinct_prefixes,
  COUNT(*)                   AS total_products
FROM brand_final
WHERE brand IS NOT NULL AND brand_confidence != 'low_confidence'
GROUP BY segment_count
ORDER BY segment_count
`;

const CATEGORY_BRAND_QUERY = `
SELECT
  f.category, f.brand, COUNT(*) AS products
FROM brand_final f
JOIN (
  SELECT brand
  FROM brand_final
  WHERE brand IS NOT NULL AND brand_confidence != 'low_confidence'
  GROUP BY brand
  ORDER BY COUNT(*) DESC
  LIMIT 20
) AS top_brands ON top_brands.brand = f.brand
WHERE f.brand IS NOT NULL AND f.brand_confidence != 'low_confidence'
GROUP BY f.category, f.brand
ORDER BY f.category, products DESC
`;

// ---------- Types ----------

export interface BrandAnalytics {
  summary: {
    total_products: number;
    matched_products: number;
    distinct_brands: number;
    noise_products: number;
    noise_brands: number;
  };
  sourceBreakdown: Array<{
    brand_source: string;
    products: number;
    pct: number;
    distinct_brands: number;
  }>;
  drift: Array<{
    brand: string;
    distinct_prefixes: number;
    total_products: number;
    confidence: "high_confidence_drift" | "likely_drift" | "single_or_noise";
    prefixes: string;
    prefixesParsed: Array<{ prefix: string; count: number }>;
  }>;
  prefixInventory: Array<{
    sku_prefix: string;
    products: number;
    distinct_brands: number;
    distinct_categories: number;
    brands_using: string;
    status: "collision" | "exclusive" | "unknown_brand";
  }>;
  prefixLengthDist: Array<{
    prefix_len: number;
    distinct_prefixes: number;
    total_products: number;
    pct: number;
  }>;
  segmentCountDist: Array<{
    segment_count: number;
    distinct_prefixes: number;
    total_products: number;
  }>;
  categoryBrandMatrix: Array<{
    category: string;
    brand: string;
    products: number;
  }>;
}

// ---------- Fetcher ----------

function parsePrefixes(raw: string): Array<{ prefix: string; count: number }> {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => {
      const m = p.trim().match(/^(.+)\((\d+)\)$/);
      return m ? { prefix: m[1], count: parseInt(m[2], 10) } : null;
    })
    .filter((x): x is { prefix: string; count: number } => x !== null)
    .sort((a, b) => b.count - a.count);
}

export async function getBrandAnalytics(): Promise<BrandAnalytics> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;
  if (!db) throw new Error("D1 binding 'DB' missing from Cloudflare context");

  const results = await executeBatch(
    [
      { sql: withCTE(SUMMARY_QUERY), params: [] },
      { sql: withCTE(SOURCE_BREAKDOWN_QUERY), params: [] },
      { sql: withCTE(DRIFT_QUERY), params: [] },
      { sql: withCTE(PREFIX_INVENTORY_QUERY), params: [] },
      { sql: withCTE(PREFIX_LENGTH_QUERY), params: [] },
      { sql: withCTE(SEGMENT_COUNT_QUERY), params: [] },
      { sql: withCTE(CATEGORY_BRAND_QUERY), params: [] },
    ],
    db,
  );

  const [summary, source, drift, inventory, lengthDist, segmentDist, catBrand] =
    results as Array<{ results: any[] }>;

  return {
    summary: summary.results[0],
    sourceBreakdown: source.results,
    drift: drift.results.map((r) => ({
      ...r,
      prefixesParsed: parsePrefixes(r.prefixes),
    })),
    prefixInventory: inventory.results,
    prefixLengthDist: lengthDist.results,
    segmentCountDist: segmentDist.results,
    categoryBrandMatrix: catBrand.results,
  };
}
