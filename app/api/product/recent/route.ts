import { NextRequest, NextResponse } from "next/server";
import {
  getRecentProducts,
  IdentifierField,
  IdentifierRule,
} from "../../../utils/d1/getRecentProducts";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit") || "10";
  const offsetParam = searchParams.get("offset") || "0";
  const sortByParam = searchParams.get("sortBy") || "updated_at";
  const sortOrderParam = searchParams.get("sortOrder") || "DESC";
  const categoryParam = searchParams.get("category") || undefined;
  const identifierRulesParam = searchParams.get("identifierRules") || "{}";

  console.log(`[API] /api/product/recent called with:`, {
    limit: limitParam,
    offset: offsetParam,
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
    category: categoryParam,
    identifierRules: identifierRulesParam,
  });

  try {
    const limit = Math.min(Math.max(parseInt(limitParam), 1), 500);
    const offset = Math.max(parseInt(offsetParam), 0);
    const sortBy = sortByParam as "updated_at" | "created_at";
    const sortOrder = sortOrderParam as "ASC" | "DESC";

    let identifierRules: Partial<Record<IdentifierField, IdentifierRule>> = {};
    try {
      identifierRules = JSON.parse(identifierRulesParam);
    } catch (e) {
      console.warn("Invalid identifierRules JSON, using empty object");
    }

    const products = await getRecentProducts({
      limit,
      offset,
      order: sortOrder,
      category: categoryParam,
      sortBy,
      identifierRules,
    });

    console.log(`[API] Returning ${products.length} products`);
    return NextResponse.json(products);
  } catch (error) {
    console.error("[API] Failed to fetch recent products:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent products" },
      { status: 500 },
    );
  }
}
