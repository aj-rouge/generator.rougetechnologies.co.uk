import { NextRequest, NextResponse } from "next/server";
import { scrapeUniversal } from "../../../utils/scrape/decodo/universal";

// 1. TYPE DEFINITIONS: Explicitly type the incoming request payload
interface BatchScraperRequestBody {
  identifiers?: string[];
}

export async function POST(req: NextRequest) {
  try {
    // 2. FIXED CAST: Explicitly typecast incoming parsed JSON data body
    const body = (await req.json()) as BatchScraperRequestBody;
    const { identifiers } = body;

    if (
      !identifiers ||
      !Array.isArray(identifiers) ||
      identifiers.length === 0
    ) {
      return NextResponse.json(
        { error: "Provide an array of identifiers" },
        { status: 400 },
      );
    }

    // Process each identifier in parallel, but don't let one failure break others
    const results = await Promise.allSettled(
      identifiers.map(async (id) => {
        const data = await scrapeUniversal(id.trim());
        return { identifier: id.trim(), ...data };
      }),
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => ({
        identifier: "identifier" in r ? (r as any).identifier : undefined,
        error: r.reason?.message || "Unknown scraping process error",
      }));

    return NextResponse.json({
      success: true,
      data: successful,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
