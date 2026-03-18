export const IMAGE_LIMITS = {
  MAX_SIZE_BYTES: 16 * 1024 * 1024,
  MAX_MEGAPIXELS: 64,
  MIN_DIMENSION: 1500, // recommended minimum
  MAX_DIMENSION: 3000, // downscale cap
  ALLOWED_FORMATS: ["jpeg", "jpg", "png", "webp"],
};

export async function validateImage(buffer, metadata) {
  const {
    MAX_SIZE_BYTES,
    MAX_MEGAPIXELS,
    MIN_DIMENSION,
    MAX_DIMENSION,
    ALLOWED_FORMATS,
  } = IMAGE_LIMITS;

  const sizeBytes = buffer.byteLength;
  const megapixels = (metadata.width * metadata.height) / 1_000_000;
  const errors = [];
  const warnings = [];

  // 1. Physical & Format Checks
  if (sizeBytes > MAX_SIZE_BYTES)
    errors.push(
      `File too large: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB (max ${MAX_SIZE_BYTES / (1024 * 1024)}MB)`,
    );

  const format = metadata.format?.toLowerCase();
  if (!ALLOWED_FORMATS.includes(format) && format) {
    warnings.push(
      `Unusual format: ${metadata.format} - will attempt to convert to WebP`,
    );
  }

  if (megapixels > MAX_MEGAPIXELS)
    errors.push(
      `Resolution too high: ${megapixels.toFixed(1)}MP (max ${MAX_MEGAPIXELS}MP)`,
    );

  // 2. Dimension Checks – now only warnings
  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    warnings.push(
      `Image large: ${metadata.width}x${metadata.height} - will be downscaled to max ${MAX_DIMENSION}px`,
    );
  }

  if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
    warnings.push(
      `Image dimensions (${metadata.width}x${metadata.height}) are below recommended minimum ${MIN_DIMENSION}px. Will attempt to upscale.`,
    );
  }

  // 3. Low Quality JPEG Detection
  if (["jpeg", "jpg"].includes(format)) {
    if (sizeBytes < 90 * 1024 && metadata.width * metadata.height > 500000) {
      warnings.push(
        "Low quality JPEG detected - Will be converted to high-quality WebP",
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      ...metadata,
      size: sizeBytes,
      megapixels,
      format,
    },
  };
}
