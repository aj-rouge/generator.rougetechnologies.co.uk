// app/api/models/route.ts
import { NextResponse } from "next/server";
import {
  getModels,
  groupModels,
  isThinker,
} from "../../utils/openrouter/models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await getModels();
    const groups = groupModels(models);

    // Keep a flat lookup so the client can resolve a slug → capabilities
    // without a second request.
    const bySlug: Record<string, (typeof models)[number]> = {};
    for (const m of models)
      bySlug[m.slug] = { ...m, isReasoningFirst: isThinker(m) };

    return NextResponse.json({
      success: true,
      data: { ...groups, bySlug },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
