// app/utils/analytics/specifications.ts
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeBatch } from "../d1/execute";
// Brand keys currently used by the brands analytics CTE
const CURRENT_BRAND_KEYS = `('brand_name','brand','manufacturer')`;

// Candidate keys to evaluate for adding to brand detection
const CANDIDATE_KEY_FILTER = `
  LOWER(key) LIKE '%brand%'
  OR LOWER(key) LIKE '%manufactur%'
  OR LOWER(key) LIKE '%vendor%'
  OR LOWER(key) LIKE '%publisher%'
  OR LOWER(key) LIKE '%mfr%'
  OR LOWER(key) LIKE '%maker%'
  OR LOWER(key) LIKE '%producer%'
  OR LOWER(key) LIKE '%mpn%'
  OR LOWER(key) LIKE '%model%'
  OR LOWER(key) LIKE '%part%'
  OR LOWER(key) LIKE '%sku%'
  OR LOWER(key) LIKE '%upc%'
  OR LOWER(key) LIKE '%ean%'
  OR LOWER(key) LIKE '%gtin%'
`;

const SUMMARY_QUERY = `
WITH products_with_brand AS (
  SELECT DISTINCT product_id
  FROM product_specifications
  WHERE LOWER(key) IN ${CURRENT_BRAND_KEYS}
    AND value IS NOT NULL AND TRIM(value) != ''
),
products_with_specs AS (
  SELECT DISTINCT product_id FROM product_specifications
)
SELECT
  (SELECT COUNT(*) FROM product_specifications)                             AS total_spec_rows,
  (SELECT COUNT(DISTINCT key) FROM product_specifications)                  AS distinct_keys,
  (SELECT COUNT(*) FROM products_with_specs)                                AS products_with_specs,
  (SELECT COUNT(*) FROM products WHERE sku IS NOT NULL AND TRIM(sku) != '') AS products_total,
  (SELECT COUNT(*) FROM products_with_brand)                                AS products_with_current_brand,
  (SELECT COUNT(*) FROM products
     WHERE sku IS NOT NULL AND TRIM(sku) != '')                             AS products_universe
`;

const KEY_INVENTORY_QUERY = `
SELECT
  key,
  COUNT(DISTINCT product_id) AS products,
  COUNT(DISTINCT value)      AS distinct_values
FROM product_specifications
WHERE value IS NOT NULL AND TRIM(value) != ''
GROUP BY key
ORDER BY products DESC
`;

const KEY_SAMPLES_QUERY = `
SELECT key, value FROM (
  SELECT
    key, value,
    ROW_NUMBER() OVER (PARTITION BY key ORDER BY spec_order, id) AS rn
  FROM product_specifications
  WHERE value IS NOT NULL AND TRIM(value) != ''
) WHERE rn <= 5
ORDER BY key, rn
`;

const POTENTIAL_GAIN_QUERY = `
WITH products_with_brand AS (
  SELECT DISTINCT product_id
  FROM product_specifications
  WHERE LOWER(key) IN ${CURRENT_BRAND_KEYS}
    AND value IS NOT NULL AND TRIM(value) != ''
)
SELECT
  ps.key,
  COUNT(DISTINCT ps.product_id)                                                           AS products_with_key,
  COUNT(DISTINCT CASE WHEN pb.product_id IS NULL THEN ps.product_id END)                  AS products_without_brand
FROM product_specifications ps
LEFT JOIN products_with_brand pb ON pb.product_id = ps.product_id
WHERE ps.value IS NOT NULL AND TRIM(ps.value) != ''
  AND (${CANDIDATE_KEY_FILTER})
GROUP BY ps.key
ORDER BY products_without_brand DESC, products_with_key DESC
`;

const ORPHAN_KEYS_QUERY = `
WITH products_with_brand AS (
  SELECT DISTINCT product_id
  FROM product_specifications
  WHERE LOWER(key) IN ${CURRENT_BRAND_KEYS}
    AND value IS NOT NULL AND TRIM(value) != ''
),
orphans AS (
  SELECT p.id
  FROM products p
  LEFT JOIN products_with_brand b ON b.product_id = p.id
  WHERE b.product_id IS NULL
    AND p.sku IS NOT NULL AND TRIM(p.sku) != ''
)
SELECT ps.key, COUNT(*) AS orphan_count
FROM product_specifications ps
JOIN orphans o ON o.id = ps.product_id
WHERE ps.value IS NOT NULL AND TRIM(ps.value) != ''
GROUP BY ps.key
ORDER BY orphan_count DESC
LIMIT 30
`;

const ORPHAN_SAMPLES_QUERY = `
WITH products_with_brand AS (
  SELECT DISTINCT product_id
  FROM product_specifications
  WHERE LOWER(key) IN ${CURRENT_BRAND_KEYS}
    AND value IS NOT NULL AND TRIM(value) != ''
),
orphans AS (
  SELECT p.id, p.title
  FROM products p
  LEFT JOIN products_with_brand b ON b.product_id = p.id
  WHERE b.product_id IS NULL
    AND p.sku IS NOT NULL AND TRIM(p.sku) != ''
)
SELECT
  o.id AS product_id,
  o.title,
  (SELECT GROUP_CONCAT(DISTINCT key) FROM product_specifications
    WHERE product_id = o.id AND value IS NOT NULL AND TRIM(value) != ''
  ) AS keys_present
FROM orphans o
ORDER BY RANDOM()
LIMIT 15
`;

// ---------- Types ----------

export interface SpecificationsAnalytics {
  summary: {
    total_spec_rows: number;
    distinct_keys: number;
    products_with_specs: number;
    products_total: number;
    products_with_current_brand: number;
    products_missing_current_brand: number;
  };
  keyInventory: Array<{
    key: string;
    products: number;
    distinct_values: number;
    sampleValues: string[];
    classification: "brand_candidate" | "identifier_candidate" | "other";
    isCurrentBrandKey: boolean;
  }>;
  potentialGain: Array<{
    key: string;
    products_with_key: number;
    products_without_brand: number;
    classification: "brand_candidate" | "identifier_candidate";
  }>;
  orphanKeys: Array<{ key: string; orphan_count: number }>;
  orphanSamples: Array<{
    product_id: string;
    title: string;
    keys_present: string;
  }>;
}

// ---------- Helpers ----------

function classifyKey(
  key: string,
): "brand_candidate" | "identifier_candidate" | "other" {
  const k = key.toLowerCase();
  if (
    k.includes("brand") ||
    k.includes("manufactur") ||
    k.includes("vendor") ||
    k.includes("publisher") ||
    k.includes("mfr") ||
    k.includes("maker") ||
    k.includes("producer")
  ) {
    return "brand_candidate";
  }
  if (
    k.includes("mpn") ||
    k.includes("model") ||
    k.includes("part") ||
    k.includes("sku") ||
    k.includes("upc") ||
    k.includes("ean") ||
    k.includes("gtin")
  ) {
    return "identifier_candidate";
  }
  return "other";
}

const CURRENT_BRAND_KEY_SET = new Set(["brand_name", "brand", "manufacturer"]);

// ---------- Fetcher ----------

export async function getSpecificationsAnalytics(): Promise<SpecificationsAnalytics> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;
  if (!db) throw new Error("D1 binding 'DB' missing from Cloudflare context");

  const results = await executeBatch(
    [
      { sql: SUMMARY_QUERY, params: [] },
      { sql: KEY_INVENTORY_QUERY, params: [] },
      { sql: KEY_SAMPLES_QUERY, params: [] },
      { sql: POTENTIAL_GAIN_QUERY, params: [] },
      { sql: ORPHAN_KEYS_QUERY, params: [] },
      { sql: ORPHAN_SAMPLES_QUERY, params: [] },
    ],
    db,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [
    summaryRes,
    keysRes,
    samplesRes,
    gainRes,
    orphanKeysRes,
    orphanSamplesRes,
  ] = results as Array<{ results: any[] }>;

  // Group samples by key
  const samplesByKey: Record<string, string[]> = {};
  for (const row of samplesRes.results) {
    if (!samplesByKey[row.key]) samplesByKey[row.key] = [];
    if (samplesByKey[row.key].length < 5) samplesByKey[row.key].push(row.value);
  }

  const summary = summaryRes.results[0];

  return {
    summary: {
      total_spec_rows: summary.total_spec_rows,
      distinct_keys: summary.distinct_keys,
      products_with_specs: summary.products_with_specs,
      products_total: summary.products_total,
      products_with_current_brand: summary.products_with_current_brand,
      products_missing_current_brand:
        summary.products_total - summary.products_with_current_brand,
    },
    keyInventory: keysRes.results.map((r) => ({
      key: r.key,
      products: r.products,
      distinct_values: r.distinct_values,
      sampleValues: samplesByKey[r.key] ?? [],
      classification: classifyKey(r.key),
      isCurrentBrandKey: CURRENT_BRAND_KEY_SET.has(r.key.toLowerCase()),
    })),
    potentialGain: gainRes.results.map((r) => ({
      key: r.key,
      products_with_key: r.products_with_key,
      products_without_brand: r.products_without_brand,
      classification:
        classifyKey(r.key) === "brand_candidate"
          ? "brand_candidate"
          : "identifier_candidate",
    })),
    orphanKeys: orphanKeysRes.results,
    orphanSamples: orphanSamplesRes.results,
  };
}
