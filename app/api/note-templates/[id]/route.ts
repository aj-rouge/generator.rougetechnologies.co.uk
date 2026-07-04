import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../../utils/d1/execute";

// GET single template (unchanged)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const rows = await executeQuery(
      `SELECT id, name, content, created_at, updated_at
       FROM note_templates
       WHERE id = ?`,
      [id],
      db,
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error("[API:note-templates] GET single error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch template" },
      { status: 500 },
    );
  }
}

// PUT – update template
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    // 🔧 Fix: type the request body
    const body = (await request.json()) as { name?: string; content?: string };
    const { name = "", content = "" } = body; // provide defaults

    if (!name.trim() || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Name and content are required" },
        { status: 400 },
      );
    }

    const existing = await executeQuery(
      "SELECT id FROM note_templates WHERE id = ?",
      [id],
      db,
    );
    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    await executeQuery(
      `UPDATE note_templates
       SET name = ?, content = ?, updated_at = ?
       WHERE id = ?`,
      [name.trim(), content.trim(), now, id],
      db,
    );

    const [updated] = await executeQuery(
      `SELECT id, name, content, created_at, updated_at
       FROM note_templates
       WHERE id = ?`,
      [id],
      db,
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API:note-templates] PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update template" },
      { status: 500 },
    );
  }
}

// DELETE template (unchanged)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const existing = await executeQuery(
      "SELECT id FROM note_templates WHERE id = ?",
      [id],
      db,
    );
    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 },
      );
    }

    await executeQuery("DELETE FROM note_templates WHERE id = ?", [id], db);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API:note-templates] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete template" },
      { status: 500 },
    );
  }
}
