import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../utils/d1/execute";

// GET all shipping method templates
export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const rows = await executeQuery(
      `SELECT id, name, content, created_at, updated_at
       FROM shipping_method_templates
       ORDER BY name`,
      [],
      db,
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("[API:shipping-method-templates] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch shipping methods",
      },
      { status: 500 },
    );
  }
}

// POST – create a new shipping method template
export async function POST(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const body = (await request.json()) as { name?: string; content?: string };
    const { name = "", content = "" } = body;

    if (!name.trim() || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Name and value are required" },
        { status: 400 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await executeQuery(
      `INSERT INTO shipping_method_templates (name, content, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), content.trim(), now, now],
      db,
    );

    const newId = result.lastRowId;
    const [newRow] = await executeQuery(
      `SELECT id, name, content, created_at, updated_at
       FROM shipping_method_templates
       WHERE id = ?`,
      [newId],
      db,
    );

    return NextResponse.json({ success: true, data: newRow }, { status: 201 });
  } catch (error: any) {
    console.error("[API:shipping-method-templates] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create shipping method",
      },
      { status: 500 },
    );
  }
}
