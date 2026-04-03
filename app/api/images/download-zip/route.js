import JSZip from "jszip";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { imageUrls, productTitle } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "No image URLs provided" },
        { status: 400 },
      );
    }

    const zip = new JSZip();
    let successCount = 0;

    // Fetch each image from the server (no CORS)
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();

        // Extract filename from URL or generate one
        let fileName = url.split("/").pop().split("?")[0];
        if (!fileName) fileName = `image-${i + 1}.webp`;
        zip.file(fileName, buffer);
        successCount++;
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err);
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { error: "No images could be downloaded" },
        { status: 500 },
      );
    }

    // Generate ZIP blob and return as downloadable file
    const zipBlob = await zip.generateAsync({ type: "nodebuffer" });
    const filename = `${productTitle || "product"}_images.zip`;

    return new NextResponse(zipBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("ZIP creation error:", error);
    return NextResponse.json(
      { error: "Failed to create ZIP file" },
      { status: 500 },
    );
  }
}
