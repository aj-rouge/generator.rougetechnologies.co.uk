import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../../utils/d1/execute";

interface UpdatePromptBody {
  template_text: string;
  name?: string;
  description?: string;
  variables?: string[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ task: string }> },
) {
  try {
    const { task } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const rows = await executeQuery(
      "SELECT task, name, description, template_text, variables FROM prompt_templates WHERE task = ?",
      [task],
      db,
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prompt template not found" },
        { status: 404 },
      );
    }

    // Parse variables if it's a JSON string
    const row = rows[0];
    if (row.variables && typeof row.variables === "string") {
      try {
        row.variables = JSON.parse(row.variables);
      } catch {
        row.variables = [];
      }
    } else if (!row.variables) {
      row.variables = [];
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error("[API:prompts] GET single error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prompt" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ task: string }> },
) {
  try {
    const { task } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const body = (await request.json()) as UpdatePromptBody;
    const { template_text, name, description, variables } = body;

    if (!template_text) {
      return NextResponse.json(
        { success: false, error: "template_text is required" },
        { status: 400 },
      );
    }

    const existing = await executeQuery(
      "SELECT task FROM prompt_templates WHERE task = ?",
      [task],
      db,
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prompt template not found" },
        { status: 404 },
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    updates.push("template_text = ?");
    values.push(template_text);

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (variables !== undefined) {
      updates.push("variables = ?");
      values.push(JSON.stringify(variables));
    }

    updates.push("updated_at = unixepoch()");
    values.push(task);

    const sql = `UPDATE prompt_templates SET ${updates.join(", ")} WHERE task = ?`;
    await executeQuery(sql, values, db);

    const updatedRow = await executeQuery(
      "SELECT task, name, description, template_text, variables FROM prompt_templates WHERE task = ?",
      [task],
      db,
    );

    // Parse variables for the response
    const row = updatedRow[0];
    if (row.variables && typeof row.variables === "string") {
      try {
        row.variables = JSON.parse(row.variables);
      } catch {
        row.variables = [];
      }
    } else if (!row.variables) {
      row.variables = [];
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    console.error("[API:prompts] PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update prompt" },
      { status: 500 },
    );
  }
}
