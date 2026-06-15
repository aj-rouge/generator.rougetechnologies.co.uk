// app/api/products/shopify-ids/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "../../../utils/d1/execute/executeQuery";

export async function GET() {
  try {
    const products = await executeQuery(
      `SELECT id FROM products WHERE shopify_id IS NOT NULL AND shopify_id != ''`,
    );
    const ids = products.map((p: any) => p.id);
    return NextResponse.json({ ids });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
