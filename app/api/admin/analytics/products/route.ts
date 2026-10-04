import { NextRequest, NextResponse } from "next/server";
import { getDb, requireStaff } from "../../../../utils/auth";
import { countProductsForAnalytics, endOfMonth, getProductsForAnalytics, startOfMonth } from "../../../../utils/d1/analytics";


export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  await requireStaff("/admin/analytics");
  const db = await getDb();
  const sp = req.nextUrl.searchParams;

  const now = new Date();
  const from = sp.get("from")
    ? new Date(sp.get("from")!).getTime()
    : startOfMonth(now);
  const to = sp.get("to")
    ? new Date(new Date(sp.get("to")!).getTime() + 86400_000).getTime()
    : endOfMonth(now);

  const view: "created" | "edits" =
    sp.get("view") === "edits" ? "edits" : "created";
  const sortDir: "asc" | "desc" = sp.get("sort") === "asc" ? "asc" : "desc";
  const requestedPage = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);

  const total = await countProductsForAnalytics(db, { from, to }, { view });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const rows = await getProductsForAnalytics(
    db,
    { from, to },
    {
      view,
      sortDir,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
  );

  return NextResponse.json({ rows, total, totalPages, page });
}
