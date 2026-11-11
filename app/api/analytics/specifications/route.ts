// app/api/analytics/specifications/route.ts
import { NextResponse } from "next/server";
import { getSpecificationsAnalytics } from "../../../utils/analytics/specifications";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getSpecificationsAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/analytics/specifications]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
