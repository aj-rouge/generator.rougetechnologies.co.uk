import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../../utils/d1/execute";

// PUT – update an existing shipping method template
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { name?: string; content?: string };
    const { name = "", content = "" } = body;

    if (!name.trim() || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Name and value are required" },
        { status: 400 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    await executeQuery(
      `UPDATE shipping_method_templates
         SET name = ?, content = ?, updated_at = ?
       WHERE id = ?`,
      [name.trim(), content.trim(), now, id],
      db,
    );

    const [updated] = await executeQuery(
      `SELECT id, name, content, created_at, updated_at
       FROM shipping_method_templates
       WHERE id = ?`,
      [id],
      db,
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API:shipping-method-templates/:id] PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update shipping method",
      },
      { status: 500 },
    );
  }
}

// DELETE – remove a shipping method template
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    await executeQuery(
      `DELETE FROM shipping_method_templates WHERE id = ?`,
      [id],
      db,
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API:shipping-method-templates/:id] DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete shipping method",
      },
      { status: 500 },
    );
  }
}
