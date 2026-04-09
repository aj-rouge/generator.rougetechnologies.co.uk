import { NextRequest, NextResponse } from "next/server";
import { getRecentProducts } from "../../../utils/d1/getRecentProducts";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit") || "10";
  const sortByParam = searchParams.get("sortBy") || "updated_at";
  const sortOrderParam = searchParams.get("sortOrder") || "DESC";
  const categoryParam = searchParams.get("category") || undefined;

  // Log request details for debugging (optional, can be debug level)
  console.log("[API] Recent products request:", {
    url: request.url,
    limit: limitParam,
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
    category: categoryParam,
  });

  try {
    const limit = parseInt(limitParam);
    const sortBy = sortByParam as "updated_at" | "created_at";
    const sortOrder = sortOrderParam as "ASC" | "DESC";

    // Validate limit (prevent excessive requests)
    const validLimit = Math.min(Math.max(limit, 1), 500);

    const products = await getRecentProducts({
      limit: validLimit,
      order: sortOrder,
      category: categoryParam,
      sortBy,
    });

    return NextResponse.json(products);
  } catch (error) {
    // Detailed error logging
    console.error("[API] Failed to fetch recent products:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "No stack trace",
      requestDetails: {
        url: request.url,
        limit: limitParam,
        sortBy: sortByParam,
        sortOrder: sortOrderParam,
        category: categoryParam,
      },
    });

    // Return a generic error response (don't expose internal details to client)
    return NextResponse.json(
      { error: "Failed to fetch recent products" },
      { status: 500 },
    );
  }
}
