// app/api/upload/file/route.js
import { NextResponse } from "next/server";
import { processAndUploadImage } from "../../../utils/images/r2Upload";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const s3Path = formData.get("s3Path");

    // 1. Basic presence check
    if (!file || !s3Path) {
      return NextResponse.json(
        { success: false, error: "Missing file or path" },
        { status: 400 },
      );
    }
    // 2. Prepare buffer and metadata
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await processAndUploadImage(buffer, s3Path, file.name);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
