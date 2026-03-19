// utils/d1/category/getCategoryBySlug.ts
import { executeQuery } from '../execute/executeQuery';

export async function getCategoryBySlug(slug: string) {
  const result = await executeQuery(
    'SELECT * FROM categories WHERE slug = ?',
    [slug]
  );
  return result?.[0] || null;
}