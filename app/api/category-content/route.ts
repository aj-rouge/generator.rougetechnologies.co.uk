// app/api/category/content/route.js
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
    // First, get the slug from the category name
    const slugResult = await db.execute(
      "SELECT slug FROM categories WHERE name = ?",
      [categoryName],
    );

    if (!slugResult || slugResult.length === 0) {
      return NextResponse.json({ success: true, content: null });
    }

    const categorySlug = slugResult[0].slug;

    // Query the category_content table
    const result = await db.execute(
      `SELECT 
        section_order,
        subheading,
        paragraphs
       FROM category_content 
       WHERE category_slug = ? 
       ORDER BY section_order ASC`,
      [categorySlug],
    );

    if (result && result.length > 0) {
      // Format the sections
      const sections = result.map((row) => {
        const section: any = {};

        if (row.subheading) {
          section.subheading = row.subheading;
        }

        // Parse paragraphs JSON if it's a string
        section.paragraphs =
          typeof row.paragraphs === "string"
            ? JSON.parse(row.paragraphs)
            : row.paragraphs;

        return section;
      });

      return NextResponse.json({
        success: true,
        content: { sections },
      });
    }

    return NextResponse.json({ success: true, content: null });
  } catch (error) {
    console.error("Error fetching category content:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch category content" },
      { status: 500 },
    );
  }
}
