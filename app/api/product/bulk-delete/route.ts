import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeBatch } from "../../../utils/d1/execute";

interface BulkDeleteRequest {
  productIds: string[];
}

export async function POST(req: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const body = (await req.json()) as BulkDeleteRequest;
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No product IDs provided" },
        { status: 400 },
      );
    }

    // Build delete statements for each product
    const statements = productIds.map((id) => ({
      sql: `DELETE FROM products WHERE id = ?`,
      params: [id],
    }));

    const results = await executeBatch(statements, db);

    // Count successful deletions (each statement returns changes)
    let deletedCount = 0;
    for (const result of results) {
      const meta = result.meta as any;
      if (meta?.changes > 0) {
        deletedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      total: productIds.length,
    });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete products" },
      { status: 500 },
    );
  }
}
