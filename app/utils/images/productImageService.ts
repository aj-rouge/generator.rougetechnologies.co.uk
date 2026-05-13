import { s3Client } from "./s3Client";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { uploadToR2FromUrl } from "./r2Upload";
import { generateSeoFileName } from "./seoGenerator";

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;

export async function moveExistingToTemp(
  productSlug: string,
  oldImages: any[],
) {
  for (const img of oldImages) {
    const s3Path = img.s3_path || img.s3Path;
    if (!s3Path) continue;

    const pathOnly = s3Path.includes("//")
      ? s3Path.split("/").slice(3).join("/")
      : s3Path;
    const filename = pathOnly.split("/").pop();
    const tempKey = `temp/${productSlug}/${filename}`;

    await s3Client.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${pathOnly}`,
        Key: tempKey,
      }),
    );
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: pathOnly }),
    );
  }
}

export async function processImages(
  uiImages: any[],
  category: string,
  productSlug: string,
  oldImages: any[],
) {
  const finalized = [];
  const BUCKET = process.env.R2_BUCKET_NAME!;
  const PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN!;

  for (let i = 0; i < uiImages.length; i++) {
    const img = uiImages[i];
    const targetS3Path = generateSeoFileName(category, productSlug, i + 1);
    let finalUrl = "";
    let stagingKey: string | null = null;

    if (img.needsUpload && img.url?.includes("/temp-uploads/")) {
      // Extract staging key from URL (remove domain)
      const urlWithoutDomain = img.url.replace(PUBLIC_DOMAIN, "");
      stagingKey = urlWithoutDomain.startsWith("/")
        ? urlWithoutDomain.slice(1)
        : urlWithoutDomain;

      // Copy from staging to final location
      await s3Client.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: `${BUCKET}/${stagingKey}`,
          Key: targetS3Path,
        }),
      );
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: stagingKey }),
      );
      finalUrl = `${PUBLIC_DOMAIN}/${targetS3Path}`;
    } else if (img.needsUpload) {
      // External URL upload
      const result = await uploadToR2FromUrl(img.url, targetS3Path);
      finalUrl = result.url;
    } else {
      // Restore from temp folder (edit mode)
      const prev = oldImages.find(
        (old) => old.url === img.url || old.s3_path === img.s3Path,
      );
      if (prev) {
        const filename = (prev.s3_path || prev.s3Path).split("/").pop();
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `${BUCKET}/temp/${productSlug}/${filename}`,
            Key: targetS3Path,
          }),
        );
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
) {
  const prefix = `${category.toLowerCase()}/${productSlug}/`;
  const list = await s3Client.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }),
  );
  if (!list.Contents) return;

  for (const obj of list.Contents) {
    const isNeeded = finalizedImages.some((img) =>
      img.s3_path.endsWith(obj.Key!),
    );
    if (!isNeeded) {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key! }),
      );
    }
  }
  // Also delete the temp folder
  const tempList = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `temp/${productSlug}/`,
    }),
  );
  for (const obj of tempList.Contents || []) {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key! }),
    );
  }
}
