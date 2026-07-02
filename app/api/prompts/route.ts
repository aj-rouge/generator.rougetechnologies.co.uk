import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../utils/d1/execute";

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const rows = await executeQuery(
      `SELECT task, name, description, template_text, variables 
       FROM prompt_templates 
       ORDER BY task`,
      [],
      db,
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("[API:prompts] GET all error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prompts" },
      { status: 500 },
    );
  }
}
