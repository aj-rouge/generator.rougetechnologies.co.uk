import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { getCurrentUser } from "../../../utils/auth";
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
  // ---- Auth ----
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  console.log(`🗑️ [START] Product Delete Request by ${user.name}`);

  const { env } = (await getCloudflareContext({ async: true })) as any;
  const db = env.DB as D1Database;
  const bucket = env.UPLOADS_BUCKET as R2Bucket;

  try {
    const body = (await req.json()) as DeleteProductRequestBody;
    const { slug, category, uuid } = body;

    if (!uuid) {
      return NextResponse.json(
        { success: false, error: "Missing product id" },
        { status: 400 },
      );
    }
    if (!slug || !category) {
      return NextResponse.json(
        { success: false, error: "Missing slug or category" },
        { status: 400 },
      );
    }

    // --- DB delete + audit, atomic ---
    console.log(
      `📊 [1/2] Deleting product ${uuid} from D1 and writing audit...`,
    );
    const result = await deleteProductById(uuid, db, user);

    if (result.changes === 0) {
      console.log("ℹ️ No product found with that id — nothing to delete.");
      return NextResponse.json({
        success: true,
        changes: 0,
        alreadyDeleted: true,
      });
    }

    // --- R2 cleanup, best-effort ---
    // If this fails, the row is already gone. Orphaned images are cosmetic.
    console.log(`🗑️ [2/2] Cleaning up R2 for prefix: ${slug}`);
    try {
      await deleteFolderRecursive(slug, bucket);
      await deleteFolderRecursive(`temp/${slug}/`, bucket);
    } catch (r2Err: any) {
      console.warn("⚠️ R2 cleanup failed (non-fatal):", r2Err.message);
    }

    console.log("🏁 [FINISH] Delete completed successfully!");
    return NextResponse.json({ success: true, changes: 1 });
  } catch (error: any) {
    console.error("💥 [DELETE ERROR]:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed" },
      { status: 500 },
    );
  }
}
