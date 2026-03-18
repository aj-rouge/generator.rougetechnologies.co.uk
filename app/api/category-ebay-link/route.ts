// app/api/category/ebay-link/route.js
import { NextResponse } from "next/server";
import { db } from "../../utils/d1/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryName = searchParams.get("name");

  if (!categoryName) {
    return NextResponse.json(
      { success: false, error: "Category name is required" },
      { status: 400 },
    );
  }

  try {
    const result = await db.execute(
      "SELECT ebay_store_link FROM categories WHERE name = ?",
      [categoryName],
    );

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        ebayLink: result[0].ebay_store_link,
      });
    }

    return NextResponse.json({ success: true, ebayLink: null });
  } catch (error) {
    console.error("Error fetching eBay link:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch eBay link" },
      { status: 500 },
    );
  }
}
