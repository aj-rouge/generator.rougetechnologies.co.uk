// utils/d1/category/getCategoryBySlug.ts

import { executeQuery } from "../execute";
import type { D1Database } from "@cloudflare/workers-types";

/**
 * Fetches a specific category row from D1 using its unique URL slug.
 * @param options - Required: db instance and the slug
 * @returns The category record object if found, or null if no match exists
 */
export async function getCategoryBySlug(options: {
  db: D1Database;
  slug: string;
}) {
  const { db, slug } = options;

  const result = await executeQuery(
    "SELECT * FROM categories WHERE slug = ?",
    [slug],
    db,
  );

  return result?.[0] || null;
}
