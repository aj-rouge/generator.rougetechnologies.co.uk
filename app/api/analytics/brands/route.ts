// app/api/analytics/brands/route.ts
import { NextResponse } from "next/server";
import { getBrandAnalytics } from "../../../utils/analytics/brands";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getBrandAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/analytics/brands]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
