// utils/images/productImageService.ts
import { uploadToR2FromUrl, uploadBufferToR2 } from "./r2Upload";
import { generateSeoFileName } from "./seoGenerator";
import { measureTime } from "../performance";

export async function moveExistingToTemp(
  productSlug: string,
  oldImages: any[],
  bucket: any,
) {
  if (!oldImages || oldImages.length === 0) return;

  console.log(
    `📦 Moving ${oldImages.length} existing images to temp for ${productSlug}`,
  );
  const start = performance.now();

  const operations = oldImages.map(async (img) => {
    const s3Path = img.s3_path || img.s3Path;
    if (!s3Path) return;

    const pathOnly = s3Path.includes("//")
      ? s3Path.split("/").slice(3).join("/")
      : s3Path;
    const filename = pathOnly.split("/").pop();
    const tempKey = `temp/${productSlug}/${filename}`;

    const object = await bucket.get(pathOnly);
    if (object) {
      await bucket.put(tempKey, await object.arrayBuffer(), {
        httpMetadata: object.httpMetadata,
      });
      await bucket.delete(pathOnly);
    }
  });

  await Promise.all(operations);

  const duration = performance.now() - start;
  console.log(`✅ moveExistingToTemp completed in ${Math.round(duration)}ms`);
}

export async function processImages(
  uiImages: any[],
  category: string,
  productSlug: string,
  oldImages: any[],
  bucket: any,
  images?: any,
) {
  const finalized: any[] = [];
  const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN!;

  // Log start
  console.log(`🖼️ Processing ${uiImages.length} images for ${productSlug}`);
  const overallStart = performance.now();

  // Process each image in parallel with per‑image timing
  const processPromises = uiImages.map(async (img, index) => {
    const label = `Image ${index + 1}`;
    return measureTime(label, async () => {
      const targetS3Path = generateSeoFileName(
        category,
        productSlug,
        index + 1,
      );
      let finalUrl = "";

      if (img.needsUpload && img.url?.includes("/temp-uploads/")) {
        const urlWithoutDomain = img.url.replace(PUBLIC_DOMAIN, "");
        const stagingKey = urlWithoutDomain.startsWith("/")
          ? urlWithoutDomain.slice(1)
          : urlWithoutDomain;

        const object = await bucket.get(stagingKey);
        if (object) {
          const buffer = await object.arrayBuffer();
          await uploadBufferToR2(buffer, targetS3Path, bucket, images);
          await bucket.delete(stagingKey);
        }
        finalUrl = `${PUBLIC_DOMAIN}/${targetS3Path}`;
      } else if (img.needsUpload) {
        const result = await uploadToR2FromUrl(
          img.url,
          targetS3Path,
          bucket,
          images,
        );
        finalUrl = result.url;
      } else {
        // Restore from temp (edit mode)
        const prev = oldImages.find(
          (old) => old.url === img.url || old.s3_path === img.s3Path,
        );
        if (prev) {
          const filename = (prev.s3_path || prev.s3Path).split("/").pop();
          const tempKey = `temp/${productSlug}/${filename}`;
          const object = await bucket.get(tempKey);
          if (object) {
            const buffer = await object.arrayBuffer();
            await uploadBufferToR2(buffer, targetS3Path, bucket, images);
          }
          finalUrl = `${PUBLIC_DOMAIN}/${targetS3Path}`;
        }
      }

      return {
        url: img.url,
        s3_path: finalUrl || img.url, // fallback to original if failed
        alt_text: img.altText || "",
      };
    });
  });

  const results = await Promise.all(processPromises);
  finalized.push(...results);

  const totalDuration = performance.now() - overallStart;
  console.log(`✅ All images processed in ${Math.round(totalDuration)}ms`);

  return finalized;
}

export async function cleanupImagesFromR2(
  category: string,
  productSlug: string,
  finalizedImages: any[],
  bucket: any,
) {
  const start = performance.now();
  const prefix = `${category.toLowerCase()}/${productSlug}/`;

  // List objects under the product prefix
  let listStart = performance.now();
  const list = await bucket.list({ prefix });
  console.log(
    `📋 Listed ${list.objects.length} objects in ${Math.round(performance.now() - listStart)}ms`,
  );

  // Delete orphaned images
  const deletePromises = [];
  for (const obj of list.objects) {
    const isNeeded = finalizedImages.some((img) =>
      img.s3_path.endsWith(obj.key),
    );
    if (!isNeeded) {
      deletePromises.push(bucket.delete(obj.key));
    }
  }
  if (deletePromises.length > 0) {
    const deleteStart = performance.now();
    await Promise.all(deletePromises);
    console.log(
      `🗑️ Deleted ${deletePromises.length} orphaned images in ${Math.round(performance.now() - deleteStart)}ms`,
    );
  }

  // Clean temp folder
  const tempPrefix = `temp/${productSlug}/`;
  const tempList = await bucket.list({ prefix: tempPrefix });
  const tempDeletePromises = tempList.objects.map((obj: any) =>
    bucket.delete(obj.key),
  );
  if (tempDeletePromises.length > 0) {
    await Promise.all(tempDeletePromises);
    console.log(`🧹 Deleted ${tempDeletePromises.length} temp objects`);
  }

  const totalDuration = performance.now() - start;
  console.log(
    `✅ cleanupImagesFromR2 completed in ${Math.round(totalDuration)}ms`,
  );
}
