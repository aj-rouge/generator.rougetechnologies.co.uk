import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../utils/d1/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy =
      (searchParams.get("sortBy") as "updated_at" | "created_at") ||
      "updated_at";
    const sortOrder =
      (searchParams.get("sortOrder") as "ASC" | "DESC") || "DESC";
    const category = searchParams.get("category") || undefined; // 👈 new

    // Validate limit (prevent excessive requests)
    const validLimit = Math.min(Math.max(limit, 1), 100);

    let products;
    if (sortBy === "updated_at") {
      products = await db.productsNew.getRecentlyUpdated(
        validLimit,
        sortOrder,
        category, // 👈 pass category
      );
    } else {
      products = await db.productsNew.getRecentlyCreated(
        validLimit,
        sortOrder,
        category, // 👈 pass category
      );
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch recent products:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
