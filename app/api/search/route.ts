// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  // Heuristic for pasted IDs: length >= 6 and no spaces
  const looksLikePaste = (q: string): boolean => q.length >= 6 && !/\s/.test(q);

  // 1. Exact match path (for direct barcode scans or pasted tracking identifiers)
  if (looksLikePaste(query)) {
    const exact = await executeQuery(
      `
      SELECT id, slug, title, sku, ean, asin, baselinker_id, shopify_id, category, updated_at
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
      db, // <-- pass db
    );

    if (exact && exact.length > 0) {
      return NextResponse.json({ results: exact });
    }
  }

  // 2. Build safe FTS query with prefix expansion (* suffix for autocomplete support)
  const words = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length === 0) {
    return NextResponse.json({ results: [] });
  }
  const ftsQuery = words.map((term) => `${term}*`).join(" ");

  // 3. Native Edge FTS search (title weighted at 5.0, sku weighted at 2.0)
  const ftsResults = await executeQuery(
    `
  SELECT p.id, p.slug, p.title, p.sku, p.ean, p.asin, p.baselinker_id, p.shopify_id, p.category, p.updated_at,
         bm25(products_search, 5.0, 2.0) as score
  FROM products_search
  JOIN products p ON p.id = products_search.product_id
  WHERE products_search MATCH ?
  ORDER BY score ASC, p.updated_at DESC
  LIMIT 20
  `,
    [ftsQuery],
    db,
  );

  // If FTS yields nothing, try a case‑insensitive LIKE on SKU and title
  if (!ftsResults || ftsResults.length === 0) {
    const likeResults = await executeQuery(
      `
    SELECT id, slug, title, sku, ean, asin, baselinker_id, shopify_id, category, updated_at
    FROM products
    WHERE LOWER(sku) LIKE ? OR LOWER(title) LIKE ?
    LIMIT 20
    `,
      [`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`],
      db,
    );
    return NextResponse.json({ results: likeResults || [] });
  }

  return NextResponse.json({ results: ftsResults || [] });
}
