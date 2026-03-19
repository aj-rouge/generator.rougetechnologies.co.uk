"use server";
import { NextResponse } from "next/server";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../../../utils/images/s3Client";
import { deleteProductById } from "../../../utils/d1/product/deleteProduct";

const deleteFolderRecursive = async (prefix: string) => {
  const bucket = process.env.R2_BUCKET_NAME;

  console.log(`🔍 Scanning for files with prefix: ${prefix}`);
  const listedObjects = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }),
  );

  if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
    console.log(`ℹ️ No files found for prefix: ${prefix}`);
    return;
  }

  await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: listedObjects.Contents.map((obj) => ({ Key: obj.Key })),
      },
    }),
  );
  console.log(
    `✅ Batch deleted ${listedObjects.Contents.length} files from: ${prefix}`,
  );
};

export async function POST(req: Request) {
  console.log("🗑️ [START] Product Delete Request");

  try {
    const { slug, category, uuid } = await req.json();

    if (!slug || !category) {
      throw new Error("Missing slug or category for deletion");
    }

    // 1. PHASE 1: Delete from R2 (Main Gallery)
    console.log(`🗑️ [1/3] Deleting images from R2 with prefix: ${slug}`);
    await deleteFolderRecursive(slug);

    // 2. PHASE 2: Delete from D1 (Database)
    console.log("📊 [2/3] Syncing removal to D1...");
    await deleteProductById(uuid);

    // 3. PHASE 3: Cleanup Temp folder
    await deleteFolderRecursive(`temp/${slug}/`);

    console.log("🏁 [FINISH] Delete completed successfully!");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("💥 [DELETE ERROR]:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
