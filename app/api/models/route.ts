// app/api/models/route.ts
import { NextResponse } from "next/server";
import { getModels } from "../../utils/openrouter/models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await getModels();
    const standard = all.filter((m) => !m.isReasoningFirst);
    const reasoning = all.filter((m) => m.isReasoningFirst);

    return NextResponse.json({
      success: true,
      data: {
        standard,
        reasoning,
        counts: {
          standard: standard.length,
          reasoning: reasoning.length,
          paidStandard: standard.filter((m) => !m.isFree).length,
          freeStandard: standard.filter((m) => m.isFree).length,
        },
      },
    });
  } catch (error: any) {
    console.error("[API:models] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch models" },
      { status: 500 },
    );
  }
}
