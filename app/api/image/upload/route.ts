// app/api/image/upload/route.ts
import { NextResponse } from "next/server";
import { uploadBufferToR2 } from "../../../utils/images/r2Upload";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: Request) {
  try {
    // Fetch bindings
    const { env } = await getCloudflareContext({ async: true });
    const bucket = (env as any).UPLOADS_BUCKET;
    const images = (env as any).IMAGES;

    const formData = await request.formData();
    const file = formData.get("file");
    const s3Path = formData.get("s3Path");

    // Validate presence and types
    if (
      !file ||
      !s3Path ||
      !(file instanceof File) ||
      typeof s3Path !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid file or path" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    // Pass the bucket and images binding to the helper
    await uploadBufferToR2(arrayBuffer, s3Path, bucket, images);

    const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN!;

    return NextResponse.json({
      success: true,
      url: `${PUBLIC_DOMAIN}/${s3Path}`,
      identifier: file.name,
      size: arrayBuffer.byteLength,
      format: "webp",
    });
  } catch (error: any) {
    console.error("💥 Image upload failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Upload failed" },
      { status: 500 },
    );
  }
}
