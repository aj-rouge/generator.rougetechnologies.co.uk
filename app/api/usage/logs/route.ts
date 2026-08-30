// app/api/usage/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../../utils/d1/execute";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    // Fetch logs with pagination
    const logs = await executeQuery(
      `SELECT id, task, model, prompt_tokens, completion_tokens, total_tokens,
              request_timestamp, rate_limit_remaining, rate_limit_reset
       FROM usage_logs
       ORDER BY request_timestamp DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
      db,
    );

    // Get total count for pagination
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM usage_logs`,
      [],
      db,
    );
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Logs API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch logs" },
      { status: 500 },
    );
  }
}
