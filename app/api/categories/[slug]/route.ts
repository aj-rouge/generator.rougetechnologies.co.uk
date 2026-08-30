// app/api/categories/[slug]/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../../utils/d1/execute";

// ---------- Types ----------
interface ContentSection {
  subheading: string | null;
  paragraphs: string[];
}

interface UpdatePayload {
  name?: string;
  ebay_store_link?: string | null;
  keywords?: string[];
  condition_group_id?: number | null;
  content?: ContentSection[];
}

// ---------- GET ----------
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    // Use the view that includes content as JSON
    const rows = await executeQuery(
      `SELECT * FROM v_category_full WHERE slug = ?`,
      [slug],
      db,
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const category = rows[0];

    // Parse JSON fields
    category.keywords = category.keywords ? JSON.parse(category.keywords) : [];
    category.content = category.content ? JSON.parse(category.content) : null;
    // condition_group is already an object from the view

    return NextResponse.json(category);
  } catch (error: any) {
    console.error("[API:categories:slug] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch category" },
      { status: 500 },
    );
  }
}

// ---------- PUT ----------
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const body = (await request.json()) as UpdatePayload;
    const { name, ebay_store_link, keywords, condition_group_id, content } =
      body;

    // Build dynamic UPDATE for categories
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (ebay_store_link !== undefined) {
      updates.push("ebay_store_link = ?");
      values.push(ebay_store_link);
    }
    if (keywords !== undefined) {
      updates.push("keywords = ?");
      values.push(JSON.stringify(keywords));
    }
    if (condition_group_id !== undefined) {
      updates.push("condition_group_id = ?");
      values.push(condition_group_id);
    }

    if (updates.length === 0 && content === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    // Update categories table if there are fields to update
    if (updates.length > 0) {
      updates.push("updated_at = unixepoch()");
      values.push(slug);
      const sql = `UPDATE categories SET ${updates.join(", ")} WHERE slug = ?`;
      await executeQuery(sql, values, db);
    }

    // Handle content update: replace all sections
    if (content !== undefined) {
      // Delete existing content
      await executeQuery(
        `DELETE FROM category_content WHERE category_slug = ?`,
        [slug],
        db,
      );

      // Insert new content sections
      if (content.length > 0) {
        const insertStmt = `
          INSERT INTO category_content (category_slug, section_order, subheading, paragraphs, created_at, updated_at)
          VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
        `;
        for (let i = 0; i < content.length; i++) {
          const section = content[i];
          const paragraphsJson = JSON.stringify(section.paragraphs);
          await executeQuery(
            insertStmt,
            [slug, i, section.subheading || null, paragraphsJson],
            db,
          );
        }
      }
    }

    // Fetch the updated category to return
    const updatedRows = await executeQuery(
      `SELECT * FROM v_category_full WHERE slug = ?`,
      [slug],
      db,
    );

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: "Category not found after update" },
        { status: 404 },
      );
    }

    const updated = updatedRows[0];
    updated.keywords = updated.keywords ? JSON.parse(updated.keywords) : [];
    updated.content = updated.content ? JSON.parse(updated.content) : null;

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[API:categories:slug] PUT error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
      { status: 500 },
    );
  }
}
