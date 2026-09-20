// utils/d1/product/deleteProduct.ts

import { executeBatch, executeQuery } from "../execute";
import type { D1Database } from "@cloudflare/workers-types";
import { buildAuditStatementParts } from "../../audit/build";
import type { Actor } from "../../audit/types";

export type AllowedProductLookupFields =
  | "id"
  | "slug"
  | "sku"
  | "ean"
  | "asin"
  | "baselinker_id"
  | "shopify_id";

/**
 * Hard-delete a product by a unique identifier field.
 *
 * - Child rows (paragraphs, features, images, specs, feedbacks) CASCADE.
 * - The audit row is written in the same transaction as the delete, so
 *   either both succeed or neither does.
 * - Returns `changes: 0` when no product matched (idempotent).
 */
const deleteProductByField = async (
  field: AllowedProductLookupFields,
  value: string,
  db: D1Database,
  actor: Actor,
): Promise<{ success: boolean; changes: number }> => {
  // Fetch first — we need the label for the audit row, and we want to skip
  // a delete + audit entry for a product that doesn't exist.
  const rows = await executeQuery(
    `SELECT id, slug, title FROM products WHERE ${field} = ?`,
    [value],
    db,
  );

  const product = rows?.[0];
  if (!product) {
    return { success: true, changes: 0 };
  }

  const del = {
    sql: `DELETE FROM products WHERE id = ?`,
    params: [product.id],
  };

  const audit = buildAuditStatementParts(actor, {
    action: "delete",
    entityType: "product",
    entityId: product.id,
    entityLabel: product.title,
    metadata: {
      deleted_row: {
        id: product.id,
        slug: product.slug,
        title: product.title,
      },
    },
  });

  // Atomic: D1's batch() runs these in a single transaction.
  await executeBatch([del, audit], db);

  return { success: true, changes: 1 };
};

// --- Convenience wrappers. All require `actor` so no delete goes unaudited. ---

export const deleteProductById = (id: string, db: D1Database, actor: Actor) =>
  deleteProductByField("id", id, db, actor);

export const deleteProductBySlug = (
  slug: string,
  db: D1Database,
  actor: Actor,
) => deleteProductByField("slug", slug, db, actor);

export const deleteProductBySku = (sku: string, db: D1Database, actor: Actor) =>
  deleteProductByField("sku", sku, db, actor);

export const deleteProductByEan = (ean: string, db: D1Database, actor: Actor) =>
  deleteProductByField("ean", ean, db, actor);

export const deleteProductByAsin = (
  asin: string,
  db: D1Database,
  actor: Actor,
) => deleteProductByField("asin", asin, db, actor);

export const deleteProductByBaselinkerId = (
  baselinkerId: string,
  db: D1Database,
  actor: Actor,
) => deleteProductByField("baselinker_id", baselinkerId, db, actor);

export const deleteProductByShopifyId = (
  shopifyId: string,
  db: D1Database,
  actor: Actor,
) => deleteProductByField("shopify_id", shopifyId, db, actor);
