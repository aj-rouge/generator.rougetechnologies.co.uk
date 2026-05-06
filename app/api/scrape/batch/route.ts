import { NextRequest, NextResponse } from "next/server";
import { scrapeUniversal } from "../../../utils/scrape/decodo/universal";

export async function POST(req: NextRequest) {
  try {
    const { identifiers } = await req.json();
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
        identifier: (r as any).identifier,
        error: r.reason?.message,
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
