import { NextResponse } from "next/server";
import { db } from "../../utils/d1/db";

export async function GET() {
  try {
    const categories = await db.execute(`
      SELECT * FROM v_category_tree
      ORDER BY name ASC
    `);

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
