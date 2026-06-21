// utils/images/r2Upload.ts

/**
 * Uploads a buffer to R2, optionally applying Cloudflare Image transformation.
 * If the `images` binding is provided, the image is transformed to WebP.
 * Otherwise, it's stored as‑is.
 */
export async function uploadBufferToR2(
  buffer: ArrayBuffer,
  targetPath: string,
  bucket: any,
  images?: any, // optional
): Promise<ArrayBuffer> {
  let dataToStore = buffer;

  if (images) {
    try {
      const response = await images.transform(buffer, {
        width: 3000,
        height: 3000,
        fit: "scale-down",
        quality: 85,
        format: "webp",
      });

      if (!response || !response.body) {
        throw new Error("Invalid response from IMAGES.transform");
      }

      // Read the stream
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      dataToStore = merged.buffer;
      console.log(
        `✅ Image transformed to WebP (${dataToStore.byteLength} bytes)`,
      );
    } catch (err) {
      console.warn("⚠️ Image transformation failed, storing original:", err);
      // fallback to original buffer
    }
  }

  await bucket.put(targetPath, dataToStore, {
    httpMetadata: {
      contentType: "image/webp", // Always store as WebP
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return dataToStore;
}

export async function uploadToR2FromUrl(
  imageUrl: string,
  targetPath: string,
  bucket: any,
  images?: any,
) {
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const originalBuffer = await response.arrayBuffer();
  const processedBuffer = await uploadBufferToR2(
    originalBuffer,
    targetPath,
    bucket,
    images,
  );
  const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN!;
  return {
    success: true,
    url: `${PUBLIC_DOMAIN}/${targetPath}`,
    size: processedBuffer.byteLength,
    format: "webp",
  };
}
