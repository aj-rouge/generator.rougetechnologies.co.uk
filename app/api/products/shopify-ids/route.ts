// app/api/products/shopify-ids/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface ProductIdRow {
  id: string;
}

export async function GET() {
  try {
    // Fetch the D1 binding
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    // Fetch only local IDs for products that have a synced Shopify record
    const products = (await executeQuery(
      `SELECT id FROM products WHERE shopify_id IS NOT NULL AND shopify_id != ''`,
      [],
      db, // <-- pass db
    )) as ProductIdRow[];

    const ids = (products || []).map((p) => p.id);

    return NextResponse.json({ ids });
  } catch (error: any) {
    console.error("[Shopify IDs Sync Endpoint Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal database connection failure" },
      { status: 500 },
    );
  }
}
