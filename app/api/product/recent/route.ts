import { NextRequest, NextResponse } from "next/server";
import { getRecentProducts } from "../../../utils/d1/getRecentProducts";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit") || "10";
  const offsetParam = searchParams.get("offset") || "0";
  const sortByParam = searchParams.get("sortBy") || "updated_at";
  const sortOrderParam = searchParams.get("sortOrder") || "DESC";
  const categoryParam = searchParams.get("category") || undefined;

  try {
    const limit = Math.min(Math.max(parseInt(limitParam), 1), 500);
    const offset = Math.max(parseInt(offsetParam), 0);
    const sortBy = sortByParam as "updated_at" | "created_at";
    const sortOrder = sortOrderParam as "ASC" | "DESC";

    const products = await getRecentProducts({
      limit,
      offset,
      order: sortOrder,
      category: categoryParam,
      sortBy,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[API] Failed to fetch recent products:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent products" },
      { status: 500 },
    );
  }
}
