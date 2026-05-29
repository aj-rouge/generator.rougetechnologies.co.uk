// /api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute/executeQuery";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  // Heuristic for pasted IDs: length >= 6 and no spaces
  const looksLikePaste = (q: string): boolean => q.length >= 6 && !/\s/.test(q);

  // 1. Exact match path (for identifiers)
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
    );

    if (exact && exact.length > 0) {
      return NextResponse.json({ results: exact });
    }
  }

  // 2. Build safe FTS query with prefix expansion
  const words = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length === 0) {
    return NextResponse.json({ results: [] });
  }
  const ftsQuery = words.map((term) => `${term}*`).join(" ");

  // 3. FTS search (title weight 5, sku weight 2)
  const ftsResults = await executeQuery(
    `
    SELECT p.id, p.slug, p.title, p.sku, p.ean, p.asin, p.baselinker_id, p.shopify_id, p.category, p.updated_at,
           bm25(products_search, 5.0, 2.0) as score
    FROM products_search
    JOIN products p ON p.id = products_search.product_id
    WHERE products_search MATCH ?
    ORDER BY score, p.updated_at DESC
    LIMIT 20
    `,
    [ftsQuery],
  );

  return NextResponse.json({ results: ftsResults || [] });
}
