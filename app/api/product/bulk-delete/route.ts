// app/api/product/bulk-delete/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { executeQuery } from "../../../utils/d1/execute";
import {
  executeBatchChunked,
  type D1Statement,
} from "../../../utils/d1/batchChunked";
import { getCurrentUser } from "../../../utils/auth";
import { buildAuditStatementParts } from "../../../utils/audit/build";

interface BulkDeleteRequest {
  productIds: string[];
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const { productIds } = (await req.json()) as BulkDeleteRequest;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No product IDs provided" },
        { status: 400 },
      );
    }

    const products = await fetchProductsForDelete(productIds, db);
    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        total: productIds.length,
      });
    }

    // Build [delete, audit] pairs — groupSize: 2 keeps them together
    const statements: D1Statement[] = [];
    for (const product of products) {
      statements.push({
        sql: `DELETE FROM products WHERE id = ?`,
        params: [product.id],
      });
      statements.push(
        buildAuditStatementParts(user, {
          action: "delete",
          entityType: "product",
          entityId: product.id,
          entityLabel: product.title,
          metadata: {
            source: "bulk_delete",
            bulk_count: products.length,
            deleted_row: {
              id: product.id,
              slug: product.slug,
              title: product.title,
            },
          },
        }),
      );
    }

    const result = await executeBatchChunked(statements, db, {
      maxStatementsPerChunk: 200,
      groupSize: 2,
    });

    // Partial failure: report what got through
    if (result.failedChunkIndex !== null) {
      const deletedCount = result.succeeded / 2; // groupSize = 2
      return NextResponse.json(
        {
          success: false,
          error: `Bulk delete stopped at chunk ${result.failedChunkIndex + 1}/${result.totalChunks}: ${result.failedChunkError}`,
          deletedCount,
          remaining: products.length - deletedCount,
          total: productIds.length,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: products.length,
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

/**
 * Fetch product labels for audit rows.
 * Chunks the IN list to stay under D1's 100-bound-param-per-statement limit.
 */
async function fetchProductsForDelete(ids: string[], db: any) {
  const IN_BATCH = 90; // 100-param cap, with a small safety buffer
  const all: Array<{ id: string; slug: string; title: string }> = [];

  for (let i = 0; i < ids.length; i += IN_BATCH) {
    const chunk = ids.slice(i, i + IN_BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = await executeQuery(
      `SELECT id, slug, title FROM products WHERE id IN (${placeholders})`,
      chunk,
      db,
    );
    all.push(...rows);
  }

  return all;
}
