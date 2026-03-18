// app/utils/images/processImage.js
import sharp from "sharp";
import { IMAGE_LIMITS } from "./validateImage";

export async function processImage(pipeline, metadata) {
  const { MIN_DIMENSION, MAX_DIMENSION, TARGET_QUALITY = 85 } = IMAGE_LIMITS;

  let operations = [];
  let warnings = [];
  let stats = {
    original: `${metadata.width}x${metadata.height}`,
    wasResized: false,
    action: "none",
    scaleFactor: 1,
  };

  // 1. INITIAL TRANSFORMATIONS
  pipeline = pipeline.rotate().modulate({
    brightness: 1.05,
    saturation: 1.02,
  });
  operations.push("enhance");

  const isTooSmall =
    metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION;
  const isTooLarge =
    metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;

  // 2. RESIZE LOGIC
  if (isTooSmall) {
    // Calculate scale factor needed to make the SHORTEST side meet the minimum
    const scaleFactor = Math.max(
      MIN_DIMENSION / metadata.width,
      MIN_DIMENSION / metadata.height,
    );

    // REMOVED: const cappedScaleFactor = Math.min(scaleFactor, 3.0);
    // We now use the full scaleFactor to ensure requirements are met.

    const targetWidth = Math.round(metadata.width * scaleFactor);
    const targetHeight = Math.round(metadata.height * scaleFactor);

    warnings.push(
      `Image was upscaled from ${metadata.width}x${metadata.height} to ${targetWidth}x${targetHeight} to meet minimum requirements (may appear blurred).`,
    );

    console.log(
      `⚠️ [FORCED UPSCALE] ${metadata.width}x${metadata.height} -> ${targetWidth}x${targetHeight}`,
    );

    pipeline = pipeline
      .resize(targetWidth, targetHeight, {
        kernel: "lanczos3", // Best for maintaining some detail during upscale
        fastShrinkOnLoad: false,
        withoutEnlargement: false, // Essential: allows stretching
      })
      .sharpen({
        // Adaptive sharpening: the more we upscale, the more we sharpen to counteract blur
        sigma: 0.5 + scaleFactor * 0.3,
        m1: 0.5,
        m2: 0.5,
      });

    operations.push(`forced_upscale_${scaleFactor.toFixed(2)}x`);
    stats.wasResized = true;
    stats.action = "upscale";
    stats.scaleFactor = scaleFactor;
  } else if (isTooLarge) {
    // ... (Keep existing downscale logic)
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    });
    operations.push("downscale");
    stats.wasResized = true;
    stats.action = "downscale";
  }

  // 3. CONVERSION to WebP
  const processedBuffer = await pipeline
    .webp({
      quality: TARGET_QUALITY,
      effort: 6,
      alphaQuality: 100,
    })
    .toBuffer();

  const finalMetadata = await sharp(processedBuffer).metadata();
  stats.processed = `${finalMetadata.width}x${finalMetadata.height}`;

  return {
    buffer: processedBuffer,
    operations: operations.length > 0 ? operations : ["convert_to_webp"],
    warnings,
    stats,
  };
}
