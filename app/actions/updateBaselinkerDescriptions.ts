"use server";

import { executeQuery } from "../utils/d1/execute/executeQuery";
import { generateProductHTML } from "../utils/htmlGenerator/generateProductHTML";

const BASELINKER_API_URL = "https://api.baselinker.com/connector.php";

export interface BaselinkerUpdateResult {
  productId: string;
  baselinkerId: string;
  success: boolean;
  error?: string;
}

async function getProductsWithBaselinkerIds(productIds: (string | number)[]) {
  if (productIds.length === 0) {
    return await executeQuery(
      `SELECT id, baselinker_id FROM products 
       WHERE baselinker_id IS NOT NULL AND baselinker_id != ''`,
    );
  }
  const allResults: any[] = [];
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
    );
    allResults.push(...results);
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
  const result = await response.json();
  if (result.status === "ERROR") {
    throw new Error(result.error_message);
  }
  return { success: true };
}

export async function batchUpdateBaselinkerDescriptions(
  productIds: (string | number)[],
  options: { delayMs?: number } = {},
) {
  const products = await getProductsWithBaselinkerIds(productIds);
  if (products.length === 0) {
    return {
      success: false,
      message: "No products with Baselinker ID found",
      results: [],
      stats: { total: 0, successful: 0, failed: 0 },
    };
  }

  const results: BaselinkerUpdateResult[] = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    try {
      const html = await generateProductHTML(product.id);
      await updateBaselinkerDescription(product.baselinker_id, html);
      results.push({
        productId: product.id,
        baselinkerId: product.baselinker_id,
        success: true,
      });
    } catch (err: any) {
      results.push({
        productId: product.id,
        baselinkerId: product.baselinker_id,
        success: false,
        error: err.message,
      });
    }
    if (i < products.length - 1 && options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;
  return {
    success: true,
    message: `Baselinker sync complete: ${successful} succeeded, ${failed} failed.`,
    results,
    stats: { total: products.length, successful, failed },
  };
}
