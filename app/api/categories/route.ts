// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { getCategories } from "../../utils/d1/category/getCategories";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    // Fetch the D1 binding
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    // Pass `db` to getCategories
    const categories = await getCategories({ db });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
