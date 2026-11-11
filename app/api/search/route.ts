// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const CDN_BASE = "https://cdn.rougetechnologies.co.uk";

/** Prefix relative paths with the CDN; leave absolute URLs alone. */
function resolveImageUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${CDN_BASE}/${path.replace(/^\/+/, "")}`;
}

export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const looksLikePaste = (q: string): boolean => q.length >= 6 && !/\s/.test(q);

  // Helper to resolve CDN URL for all results before sending
  const processResults = (rows: any[]) => {
    if (!rows) return [];
    return rows.map((row) => ({
      ...row,
      image_url: resolveImageUrl(row.image_url),
    }));
  };

  // 1. Exact match path
  if (looksLikePaste(query)) {
    const exact = await executeQuery(
      `
      SELECT id, slug, title, sku, ean, asin, baselinker_id, shopify_id, category, updated_at,
             (SELECT COALESCE(pi.s3_path, pi.url) FROM product_images pi WHERE pi.product_id = products.id ORDER BY pi.image_order ASC LIMIT 1) as image_url
      FROM products
      WHERE id = ?
         OR ean = ?
         OR asin = ?
         OR sku = ?
         OR baselinker_id = ?
         OR shopify_id = ?
      LIMIT 20
      `,
      [query, query, query, query, query, query],
      db,
    );

    if (exact && exact.length > 0) {
      return NextResponse.json({ results: processResults(exact) });
    }
  }

  // 2. Build safe FTS query with prefix expansion
  const words = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length === 0) {
    return NextResponse.json({ results: [] });
  }
  const ftsQuery = words.map((term) => `${term}*`).join(" ");

  // 3. Native Edge FTS search
  const ftsResults = await executeQuery(
    `
    SELECT p.id, p.slug, p.title, p.sku, p.ean, p.asin, p.baselinker_id, p.shopify_id, p.category, p.updated_at,
           bm25(products_search, 5.0, 2.0) as score,
           (SELECT COALESCE(pi.s3_path, pi.url) FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.image_order ASC LIMIT 1) as image_url
    FROM products_search
    JOIN products p ON p.id = products_search.product_id
    WHERE products_search MATCH ?
    ORDER BY score ASC, p.updated_at DESC
    LIMIT 20
    `,
    [ftsQuery],
    db,
  );

  // 4. Fallback to LIKE if FTS yields nothing
  if (!ftsResults || ftsResults.length === 0) {
    const likeResults = await executeQuery(
      `
      SELECT id, slug, title, sku, ean, asin, baselinker_id, shopify_id, category, updated_at,
             (SELECT COALESCE(pi.s3_path, pi.url) FROM product_images pi WHERE pi.product_id = products.id ORDER BY pi.image_order ASC LIMIT 1) as image_url
      FROM products
      WHERE LOWER(sku) LIKE ? OR LOWER(title) LIKE ?
      LIMIT 20
      `,
      [`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`],
      db,
    );
    return NextResponse.json({ results: processResults(likeResults || []) });
  }

  return NextResponse.json({ results: processResults(ftsResults || []) });
}
