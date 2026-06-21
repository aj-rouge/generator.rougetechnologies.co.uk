// app/actions/updateBaselinkerDescriptions.ts
"use server";

import { executeQuery } from "../utils/d1/execute";
import { generateProductHTML } from "../utils/htmlGenerator/generateProductHTML";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

const BASELINKER_API_URL = "https://api.baselinker.com/connector.php";

export interface BaselinkerUpdateResult {
  productId: string | number;
  baselinkerId: string;
  success: boolean;
  error?: string;
}

interface BaselinkerApiResponse {
  status: "SUCCESS" | "ERROR";
  error_code?: string;
  error_message?: string;
  [key: string]: any;
}

interface ProductRow {
  id: string | number;
  baselinker_id: string;
}

async function getProductsWithBaselinkerIds(
  productIds: (string | number)[],
  db: D1Database,
): Promise<ProductRow[]> {
  if (productIds.length === 0) {
    const results = await executeQuery(
      `SELECT id, baselinker_id FROM products 
       WHERE baselinker_id IS NOT NULL AND baselinker_id != ''`,
      [],
      db, // <-- pass db
    );
    return (results || []) as ProductRow[];
  }

  const allResults: ProductRow[] = [];
  const chunkSize = 100;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    const results = await executeQuery(
      `SELECT id, baselinker_id FROM products 
       WHERE id IN (${placeholders}) 
         AND baselinker_id IS NOT NULL 
         AND baselinker_id != ''`,
      chunk,
      db, // <-- pass db
    );
    allResults.push(...((results || []) as ProductRow[]));
  }
  return allResults;
}

async function updateBaselinkerDescription(
  baselinkerId: string,
  htmlDescription: string,
) {
  const payload = {
    storage_id: process.env.BASELINKER_STORAGE_ID || "bl_1",
    product_id: baselinkerId,
    description: htmlDescription,
  };

  const formData = new URLSearchParams();
  formData.append("method", "addProduct");
  formData.append("parameters", JSON.stringify(payload));

  const response = await fetch(BASELINKER_API_URL, {
    method: "POST",
    headers: {
      "X-BLToken": process.env.BASELINKER_TOKEN!,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const result = (await response.json()) as BaselinkerApiResponse;

  if (result.status === "ERROR") {
    throw new Error(
      result.error_message || "Unknown BaseLinker integration failure",
    );
  }
  return { success: true };
}

export async function batchUpdateBaselinkerDescriptions(
  productIds: (string | number)[],
  options: { delayMs?: number } = {},
) {
  // 1. Fetch the D1 binding
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;

  // 2. Pass db to getProductsWithBaselinkerIds
  const products = await getProductsWithBaselinkerIds(productIds, db);

  if (products.length === 0) {
    return {
      success: false,
      message: "No products with a mapped Baselinker assignment record found.",
      results: [],
      stats: { total: 0, successful: 0, failed: 0 },
    };
  }

  const results: BaselinkerUpdateResult[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      const html = await generateProductHTML(String(product.id));

      await updateBaselinkerDescription(product.baselinker_id, html);

      results.push({
        productId: product.id,
        baselinkerId: product.baselinker_id,
        success: true,
      });
    } catch (err: any) {
      const errorMessage = err.message || "";

      if (errorMessage.includes("Product not found")) {
        // 3. Pass db to executeQuery for the update
        await executeQuery(
          `UPDATE products SET baselinker_id = NULL WHERE id = ?`,
          [product.id],
          db, // <-- pass db
        );
        results.push({
          productId: product.id,
          baselinkerId: product.baselinker_id,
          success: false,
          error:
            "Stale reference mapping broken. Remote item was missing, identity tracking flushed.",
        });
      } else {
        results.push({
          productId: product.id,
          baselinkerId: product.baselinker_id,
          success: false,
          error:
            errorMessage ||
            "An unexpected error occurred during item node synchronization",
        });
      }
    }

    if (i < products.length - 1 && options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  return {
    success: true,
    message: `Baselinker description mass-update cycle complete: ${successful} synced, ${failed} unlinked/failed.`,
    results,
    stats: { total: products.length, successful, failed },
  };
}
