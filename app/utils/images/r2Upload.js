import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { processImage } from "./processImage";
import { s3Client } from "./s3Client";
import { validateImage } from "./validateImage";

/**
 * Shared Core: Takes a buffer and handles the full pipeline
 */
export async function processAndUploadImage(
  imageBuffer,
  s3Path,
  originalNameOrUrl,
) {
  const pipeline = sharp(imageBuffer);
  const metadata = await pipeline.metadata();

  const validation = await validateImage(imageBuffer, metadata);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(", "));
  }

  const {
    buffer: processedBuffer,
    stats,
    operations,
    warnings: processingWarnings,
  } = await processImage(pipeline, metadata);

  const allWarnings = [
    ...(validation.warnings || []),
    ...(processingWarnings || []),
  ];

  const key = s3Path.replace("https://cdn.rougetechnologies.co.uk/", "");

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: processedBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=1",
    }),
  );

  const r2Url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}/${key}`;

  return {
    success: true,
    url: r2Url,
    identifier: originalNameOrUrl,
    size: processedBuffer.length,
    format: "webp",
    originalSize: imageBuffer.length,
    originalDimensions: `${metadata.width}x${metadata.height}`,
    processedDimensions: stats.processed,
    operations,
    wasOptimized: operations.length > 0,
    optimizationStats: stats,
    compressionRatio: processedBuffer.length / imageBuffer.length,
    warnings: allWarnings,
    wasUpscaled: stats.action === "upscale",
  };
}

/**
 * Wrapper for URL-based uploads
 */
export async function uploadToR2FromUrl(imageUrl, targetS3Path) {
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  return await processAndUploadImage(buffer, targetS3Path, imageUrl);
}
