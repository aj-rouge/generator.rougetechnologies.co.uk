import { NextResponse } from "next/server";
import { executeQuery } from "../../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  }

  const images = await executeQuery(
    `SELECT image_order, url, s3_path, alt_text
     FROM product_images
     WHERE product_id = ?
     ORDER BY image_order ASC`,
    [id],
    db,
  );

  return NextResponse.json({ images: images || [] });
}
