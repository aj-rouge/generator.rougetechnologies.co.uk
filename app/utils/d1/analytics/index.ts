import type { D1Database } from "@cloudflare/workers-types";
import { executeQuery } from "../execute";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
export type DateRange = {
  /** unix ms inclusive */
  from: number;
  /** unix ms exclusive */
  to: number;
};

export type EmployeeSummary = {
  user_id: string;
  user_name: string;
  user_email: string;
  total_actions: number;
  products_created: number;
  products_edited: number;
  products_deleted: number;
  distinct_products: number;
  first_action_at: number;
  last_action_at: number;
};

export type DailyActivity = {
  day: string; // YYYY-MM-DD
  user_id: string;
  user_name: string;
  actions: number;
};

export type FieldChangeCount = {
  field: string;
  times_changed: number;
};

export type ProductEditCount = {
  product_id: string;
  product_label: string;
  edits: number;
  last_edited_at: number;
};

export type RecentEvent = {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  summary: string | null;
  changes: string | null;
  metadata: string | null;
  created_at: number;
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
export function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function endOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

export function startOfMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function endOfMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ----------------------------------------------------------------
// 1. Per-employee summary for a date range
// ----------------------------------------------------------------
export async function getEmployeeSummaries(
  db: D1Database,
  range: DateRange,
): Promise<EmployeeSummary[]> {
  const sql = `
    SELECT
      al.user_id,
      al.user_name,
      al.user_email,
      COUNT(*)                                                             AS total_actions,
      SUM(CASE WHEN al.action = 'create' AND al.entity_type = 'product'
               THEN 1 ELSE 0 END)                                          AS products_created,
      SUM(CASE WHEN al.action = 'update' AND al.entity_type = 'product'
               THEN 1 ELSE 0 END)                                          AS products_edited,
      SUM(CASE WHEN al.action = 'delete' AND al.entity_type = 'product'
               THEN 1 ELSE 0 END)                                          AS products_deleted,
      COUNT(DISTINCT CASE WHEN al.entity_type = 'product'
                          THEN al.entity_id END)                           AS distinct_products,
      MIN(al.created_at)                                                   AS first_action_at,
      MAX(al.created_at)                                                   AS last_action_at
    FROM activity_log al
    WHERE al.user_id IS NOT NULL
      AND al.created_at >= ?
      AND al.created_at <  ?
    GROUP BY al.user_id
    ORDER BY total_actions DESC
  `;
  return executeQuery(sql, [range.from, range.to], db);
}

// ----------------------------------------------------------------
// 2. Daily activity, one row per (day × user)
// ----------------------------------------------------------------
export async function getDailyActivity(
  db: D1Database,
  range: DateRange,
): Promise<DailyActivity[]> {
  const sql = `
    SELECT
      date(al.created_at / 1000, 'unixepoch') AS day,
      al.user_id,
      al.user_name,
      COUNT(*) AS actions
    FROM activity_log al
    WHERE al.user_id IS NOT NULL
      AND al.created_at >= ?
      AND al.created_at <  ?
    GROUP BY day, al.user_id
    ORDER BY day ASC, al.user_name ASC
  `;
  return executeQuery(sql, [range.from, range.to], db);
}

// ----------------------------------------------------------------
// 3. Top changed fields within a range, optionally for one user
// ----------------------------------------------------------------
export async function getFieldChangeCounts(
  db: D1Database,
  range: DateRange,
  userId?: string,
): Promise<FieldChangeCount[]> {
  const params: any[] = [range.from, range.to];
  const userFilter = userId ? "AND al.user_id = ?" : "";
  if (userId) params.push(userId);

  const sql = `
    SELECT
      json_extract(je.value, '$.field') AS field,
      COUNT(*)                           AS times_changed
    FROM activity_log al, json_each(al.changes) je
    WHERE al.action = 'update'
      AND al.changes IS NOT NULL
      AND al.created_at >= ?
      AND al.created_at <  ?
      ${userFilter}
    GROUP BY field
    ORDER BY times_changed DESC
    LIMIT 20
  `;
  return executeQuery(sql, params, db);
}

// ----------------------------------------------------------------
// 4. Most-edited products in a range
// ----------------------------------------------------------------
export async function getMostEditedProducts(
  db: D1Database,
  range: DateRange,
  limit = 10,
): Promise<ProductEditCount[]> {
  const sql = `
    SELECT
      al.entity_id                        AS product_id,
      MAX(al.entity_label)                AS product_label,
      COUNT(*)                            AS edits,
      MAX(al.created_at)                  AS last_edited_at
    FROM activity_log al
    WHERE al.entity_type = 'product'
      AND al.action IN ('create', 'update', 'delete')
      AND al.created_at >= ?
      AND al.created_at <  ?
    GROUP BY al.entity_id
    ORDER BY edits DESC
    LIMIT ?
  `;
  return executeQuery(sql, [range.from, range.to, limit], db);
}
// ----------------------------------------------------------------
// 4. Product list for analytics: "latest created" (default) or
//    "most edited", with pagination + sort direction.
// ----------------------------------------------------------------

export type ProductListRow = {
  product_id: string;
  product_label: string;
  edits: number;
  created_at: number | null; // null when a product was only edited, never created, in range
  last_activity_at: number;
  created_by: string | null; // who originally created the product
};

export type ProductListView = "created" | "edits";

function productListHaving(view: ProductListView): string {
  // "created" view only shows products actually created in the range.
  return view === "created" ? "HAVING created_at IS NOT NULL" : "";
}

export async function countProductsForAnalytics(
  db: D1Database,
  range: DateRange,
  opts: { view?: ProductListView } = {},
): Promise<number> {
  const view: ProductListView = opts.view ?? "created";
  const sql = `
    SELECT COUNT(*) AS total FROM (
      SELECT
        al.entity_id,
        MIN(CASE WHEN al.action = 'create' THEN al.created_at END) AS created_at
      FROM activity_log al
      WHERE al.entity_type = 'product'
        AND al.action IN ('create', 'update', 'delete')
        AND al.entity_id IS NOT NULL
        AND al.created_at >= ?
        AND al.created_at <  ?
      GROUP BY al.entity_id
      ${productListHaving(view)}
    )
  `;
  const rows = await executeQuery<{ total: number }>(
    sql,
    [range.from, range.to],
    db,
  );
  return rows[0]?.total ?? 0;
}

export async function getProductsForAnalytics(
  db: D1Database,
  range: DateRange,
  opts: {
    view?: ProductListView;
    sortDir?: "asc" | "desc";
    limit?: number;
    offset?: number;
  } = {},
): Promise<ProductListRow[]> {
  const view: ProductListView = opts.view ?? "created";
  const dir = (opts.sortDir ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const orderColumn = view === "edits" ? "edits" : "created_at";

  const sql = `
    SELECT
      al.entity_id                                          AS product_id,
      COALESCE(MAX(al.entity_label), MAX(al.entity_id))     AS product_label,
      SUM(CASE WHEN al.action = 'update' THEN 1 ELSE 0 END) AS edits,
      MIN(CASE WHEN al.action = 'create' THEN al.created_at END) AS created_at,
      MAX(al.created_at)                                    AS last_activity_at,
      (
        SELECT al2.user_name
        FROM activity_log al2
        WHERE al2.entity_type = 'product'
          AND al2.entity_id   = al.entity_id
          AND al2.action      = 'create'
        ORDER BY al2.created_at ASC
        LIMIT 1
      )                                                     AS created_by
    FROM activity_log al
    WHERE al.entity_type = 'product'
      AND al.action IN ('create', 'update', 'delete')
      AND al.entity_id IS NOT NULL
      AND al.created_at >= ?
      AND al.created_at <  ?
    GROUP BY al.entity_id
    ${productListHaving(view)}
    ORDER BY ${orderColumn} ${dir}, al.entity_id ASC
    LIMIT ? OFFSET ?
  `;
  return executeQuery<ProductListRow>(
    sql,
    [range.from, range.to, limit, offset],
    db,
  );
}
// ----------------------------------------------------------------
// 5. Recent events (for the live feed)
// ----------------------------------------------------------------
export async function getRecentEvents(
  db: D1Database,
  opts: {
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    range?: DateRange;
  } = {},
): Promise<RecentEvent[]> {
  const where: string[] = [];
  const params: any[] = [];

  if (opts.userId) {
    where.push("al.user_id = ?");
    params.push(opts.userId);
  }
  if (opts.action) {
    where.push("al.action = ?");
    params.push(opts.action);
  }
  if (opts.entityType) {
    where.push("al.entity_type = ?");
    params.push(opts.entityType);
  }
  if (opts.range) {
    where.push("al.created_at >= ?");
    where.push("al.created_at <  ?");
    params.push(opts.range.from, opts.range.to);
  }

  const sql = `
    SELECT
      al.id, al.user_id, al.user_name,
      al.action, al.entity_type, al.entity_id, al.entity_label,
      al.summary, al.changes, al.metadata, al.created_at
    FROM activity_log al
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY al.created_at DESC
    LIMIT ?
  `;
  params.push(Math.min(opts.limit ?? 50, 200));
  return executeQuery(sql, params, db);
}

// ----------------------------------------------------------------
// 6. Per-product history — master + children in one feed
// ----------------------------------------------------------------
export async function getProductHistory(
  db: D1Database,
  productId: string,
  limit = 100,
): Promise<RecentEvent[]> {
  const sql = `
    SELECT
      al.id, al.user_id, al.user_name,
      al.action, al.entity_type, al.entity_id, al.entity_label,
      al.summary, al.changes, al.metadata, al.created_at
    FROM activity_log al
    WHERE (al.entity_type = 'product' AND al.entity_id = ?)
       OR (al.parent_type = 'product' AND al.parent_id = ?)
    ORDER BY al.created_at DESC
    LIMIT ?
  `;
  return executeQuery(sql, [productId, productId, limit], db);
}

// ----------------------------------------------------------------
// 7. Distinct users who appear in the log (for filter dropdowns)
// ----------------------------------------------------------------
export async function getActiveUsers(
  db: D1Database,
  range: DateRange,
): Promise<{ user_id: string; user_name: string }[]> {
  const sql = `
    SELECT DISTINCT al.user_id, al.user_name
    FROM activity_log al
    WHERE al.user_id IS NOT NULL
      AND al.created_at >= ?
      AND al.created_at <  ?
    ORDER BY al.user_name ASC
  `;
  return executeQuery(sql, [range.from, range.to], db);
}
