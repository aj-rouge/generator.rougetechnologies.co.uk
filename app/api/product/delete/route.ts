import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { deleteProductById } from "../../../utils/d1/product/deleteProduct";

interface DeleteProductRequestBody {
  slug?: string;
  category?: string;
  uuid?: string;
}

const deleteFolderRecursive = async (prefix: string, bucket: R2Bucket) => {
  console.log(`🔍 Scanning for files with prefix: ${prefix}`);
  const listResult = await bucket.list({ prefix });
  const objects = listResult.objects;

  if (!objects || objects.length === 0) {
    console.log(`ℹ️ No files found for prefix: ${prefix}`);
    return;
  }

  await Promise.all(objects.map((obj) => bucket.delete(obj.key)));
  console.log(`✅ Deleted ${objects.length} files from: ${prefix}`);
};

export async function POST(req: Request) {
  console.log("🗑️ [START] Product Delete Request");

  // Cast env to any to avoid TypeScript errors about unknown bindings
  const { env } = (await getCloudflareContext({ async: true })) as any;
  const db = env.DB as D1Database;
  const bucket = env.UPLOADS_BUCKET as R2Bucket;

  try {
    const body = (await req.json()) as DeleteProductRequestBody;
    const { slug, category, uuid } = body;

    if (!slug || !category) {
      throw new Error("Missing slug or category for deletion");
    }

    console.log(`🗑️ [1/3] Deleting images from R2 with prefix: ${slug}`);
    await deleteFolderRecursive(slug, bucket);

    console.log("📊 [2/3] Syncing removal to D1...");
    if (uuid) {
      await deleteProductById(uuid, db);
    } else {
      console.log("⚠️ No explicit uuid provided, skipped DB deletion.");
    }

    await deleteFolderRecursive(`temp/${slug}/`, bucket);

    console.log("🏁 [FINISH] Delete completed successfully!");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("💥 [DELETE ERROR]:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
