// app/api/usage/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../utils/d1/execute";

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    // Totals
    const totals = await executeQuery(
      `SELECT 
         SUM(prompt_tokens) as total_prompt_tokens,
         SUM(completion_tokens) as total_completion_tokens,
         SUM(total_tokens) as total_tokens,
         COUNT(*) as total_requests,
         MAX(rate_limit_remaining) as current_rate_limit_remaining,
         MAX(rate_limit_reset) as current_rate_limit_reset
       FROM usage_logs`,
      [],
      db,
    );

    // Daily breakdown (last 7 days)
    const daily = await executeQuery(
      `SELECT 
         date(datetime(request_timestamp/1000, 'unixepoch')) as day,
         SUM(total_tokens) as tokens,
         COUNT(*) as requests
       FROM usage_logs
       WHERE request_timestamp > strftime('%s', 'now', '-7 days') * 1000
       GROUP BY day
       ORDER BY day`,
      [],
      db,
    );

    // Per‑task breakdown
    const byTask = await executeQuery(
      `SELECT task, SUM(total_tokens) as tokens, COUNT(*) as requests
       FROM usage_logs
       GROUP BY task`,
      [],
      db,
    );

    return NextResponse.json({
      totals: totals[0] || { total_tokens: 0, total_requests: 0 },
      daily: daily || [],
      byTask: byTask || [],
    });
  } catch (error: any) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch usage" },
      { status: 500 },
    );
  }
}
