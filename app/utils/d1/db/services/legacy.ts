import { executeQuery } from "../client";
import { insertRow, updateRow, deleteRow } from "../helpers";
import type {
  ProductSearch,
  ProductSearchInsert,
} from "../../../search/schema";

export const searchProductsLegacy = async (
  query: string,
): Promise<ProductSearch[]> => {
  return await executeQuery(
    "SELECT * FROM products_search WHERE title LIKE ? OR sku LIKE ? ORDER BY created_at DESC",
    [`%${query}%`, `%${query}%`],
  );
};

export const insertProductLegacy = async (
  product: ProductSearchInsert,
): Promise<{ success: boolean; changes: number }> => {
  return await insertRow("products_search", product);
};

export const updateProductLegacy = async (
  slug: string,
  updates: Partial<ProductSearch>,
): Promise<{ success: boolean; changes: number }> => {
  return await updateRow("products_search", updates, { slug });
};

export const deleteProductBySlug = async (
  slug: string,
): Promise<{ success: boolean; changes: number }> => {
  return await deleteRow("products", { slug });
};

export const getRecentlyUpdated = async (
  limit = 10,
  order: "DESC" | "ASC" = "DESC",
) => {
  return await executeQuery(
    `SELECT * FROM products_search ORDER BY updated_at ${order} LIMIT ?`,
    [limit],
  );
};

export const getRecentlyCreated = async (
  limit = 10,
  order: "DESC" | "ASC" = "DESC",
) => {
  return await executeQuery(
    `SELECT * FROM products_search ORDER BY created_at ${order} LIMIT ?`,
    [limit],
  );
};
