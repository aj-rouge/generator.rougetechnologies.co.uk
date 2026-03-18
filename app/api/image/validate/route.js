// app/api/image/validate/route.js
import { NextResponse } from "next/server";
import sharp from "sharp";
import { validateImage } from "../../../utils/images/validateImage";

export async function POST(request) {
  try {
    const { imageUrl } = await request.json();
    if (!imageUrl)
      return NextResponse.json(
        { success: false, error: "Missing imageUrl" },
        { status: 400 },
      );

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageUploader/1.0)",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(buffer).metadata();

    // The utility now handles dimensions, upscaling, AND quality checks
    const validation = await validateImage(buffer, metadata);

    return NextResponse.json({ success: true, validation });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
