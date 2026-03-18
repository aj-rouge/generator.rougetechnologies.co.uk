// app/api/category/data/route.js
import { NextResponse } from "next/server";
import { db } from "../../../utils/d1/db";

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
    // Get category basic info from DB
    const categoryResult = await db.execute(
      `SELECT 
        c.slug, 
        c.keywords, 
        c.ebay_store_link, 
        c.condition_group_id 
       FROM categories c 
       WHERE c.name = ?`,
      [categoryName],
    );

    if (!categoryResult || categoryResult.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const cat = categoryResult[0];
    const slug = cat.slug;
    const keywords = cat.keywords
      ? typeof cat.keywords === "string"
        ? JSON.parse(cat.keywords)
        : cat.keywords
      : [];
    const ebayLink = cat.ebay_store_link;

    // Get condition group
    let conditionGroup = null;
    if (cat.condition_group_id) {
      const conditionResult = await db.execute(
        `SELECT 
          c.group_key, 
          c.group_name,
          (SELECT json_group_array(option_value ORDER BY option_order) 
           FROM condition_options 
           WHERE condition_group_id = c.id) as options
         FROM conditions c 
         WHERE c.id = ?`,
        [cat.condition_group_id],
      );

      if (conditionResult && conditionResult.length > 0) {
        const opt = conditionResult[0];
        conditionGroup = {
          group_key: opt.group_key,
          group_name: opt.group_name,
          options: opt.options
            ? typeof opt.options === "string"
              ? JSON.parse(opt.options)
              : opt.options
            : [],
        };
      }
    }

    // Get category content from the category_content table
    const contentResult = await db.execute(
      `SELECT 
        section_order,
        subheading,
        paragraphs
       FROM category_content 
       WHERE category_slug = ? 
       ORDER BY section_order ASC`,
      [slug],
    );

    // Format the content to match the CATEGORY_SECTIONS structure
    let content = null;
    if (contentResult && contentResult.length > 0) {
      const sections = contentResult.map((row) => {
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

      content = { sections };
    }

    return NextResponse.json({
      success: true,
      data: {
        keywords,
        ebayLink,
        conditionGroup,
        content,
      },
    });
  } catch (error) {
    console.error("Error fetching category data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch category data" },
      { status: 500 },
    );
  }
}
