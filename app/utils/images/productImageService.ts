// utils/images/productImageService.ts
import { uploadToR2FromUrl, uploadBufferToR2 } from "./r2Upload";
import { generateSeoFileName } from "./seoGenerator";

export async function moveExistingToTemp(
  productSlug: string,
  oldImages: any[],
  bucket: any, // <-- added
) {
  for (const img of oldImages) {
    const s3Path = img.s3_path || img.s3Path;
    if (!s3Path) continue;

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
  }
}

export async function processImages(
  uiImages: any[],
  category: string,
  productSlug: string,
  oldImages: any[],
  bucket: any,
  images?: any, // <-- added
) {
  const finalized = [];
  const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN!;

  for (let i = 0; i < uiImages.length; i++) {
    const img = uiImages[i];
    const targetS3Path = generateSeoFileName(category, productSlug, i + 1);
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

    finalized.push({
      url: img.url,
      s3_path: finalUrl,
      alt_text: img.altText || "",
    });
  }
  return finalized;
}

export async function cleanupImagesFromR2(
  category: string,
  productSlug: string,
  finalizedImages: any[],
  bucket: any, // <-- added
) {
  const prefix = `${category.toLowerCase()}/${productSlug}/`;
  const list = await bucket.list({ prefix });
  for (const obj of list.objects) {
    const isNeeded = finalizedImages.some((img) =>
      img.s3_path.endsWith(obj.key),
    );
    if (!isNeeded) {
      await bucket.delete(obj.key);
    }
  }

  const tempPrefix = `temp/${productSlug}/`;
  const tempList = await bucket.list({ prefix: tempPrefix });
  for (const obj of tempList.objects) {
    await bucket.delete(obj.key);
  }
}
