// app/actions/updateShopifyDescriptions.ts
"use server";

import { executeQuery } from "../utils/d1/execute";
import { generateProductHTML } from "../utils/htmlGenerator/generateProductHTML";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

const SHOPIFY_API_VERSION = "2026-01";

const UPDATE_PRODUCT_DESCRIPTION_MUTATION = `
  mutation UpdateProductDescription($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        title
        descriptionHtml
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface ProductUpdateOptions {
  limit?: number;
  order?: "ASC" | "DESC";
  sortBy?: string;
  delayMs?: number;
  productIds?: (string | number)[];
}

export interface ProductUpdateResult {
  productId: string | number;
  shopifyId?: string | number;
  shopifyGid?: string;
  success: boolean;
  title?: string;
  error?: string;
}

export interface UpdateProductsResponse {
  success: boolean;
  message: string;
  results: ProductUpdateResult[];
  errors: ProductUpdateResult[];
  stats: {
    total: number;
    successful: number;
    failed: number;
    startedAt: string;
    finishedAt: string;
  };
}

interface ProductDbRow {
  id: string | number;
  shopify_id: string | null;
}

interface ShopifyGraphQLResponse {
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  data?: {
    productUpdate?: {
      product: {
        id: string;
        title: string;
        descriptionHtml: string;
      };
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

function toShopifyProductGid(shopifyId: string | number): string {
  const idStr = String(shopifyId);
  return idStr.startsWith("gid://shopify/Product/")
    ? idStr
    : `gid://shopify/Product/${idStr}`;
}

function extractProductDetails(htmlString: string): string {
  try {
    const targetClass = 'class="rouge-technologies-details"';
    const startIndex = htmlString.indexOf(targetClass);

    if (startIndex === -1) return htmlString;

    const openDivIndex = htmlString.lastIndexOf("<div", startIndex);
    if (openDivIndex === -1) return htmlString;

    const endDivIndex = htmlString.indexOf("</div>", startIndex);
    if (endDivIndex === -1) return htmlString;

    const rawContainer = htmlString.slice(openDivIndex, endDivIndex + 6);

    return rawContainer.replace(
      /<span class="rouge-technologies-details__checkmark">.*?<\/span>/g,
      "",
    );
  } catch (error) {
    console.warn(
      "⚠️ Fallback triggered during string extraction processing:",
      error,
    );
    return htmlString;
  }
}

async function updateShopifyProductDescription(
  shopifyProductGid: string,
  htmlDescription: string,
): Promise<{ id: string; title: string; descriptionHtml: string }> {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    throw new Error("Missing Shopify environment authorization tokens");
  }

  const response = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: UPDATE_PRODUCT_DESCRIPTION_MUTATION,
        variables: {
          product: {
            id: shopifyProductGid,
            descriptionHtml: htmlDescription,
          },
        },
      }),
    },
  );

  const json = (await response.json()) as ShopifyGraphQLResponse;

  if (!response.ok) {
    throw new Error(`HTTP network error wrapper failure: ${response.status}`);
  }

  if (json.errors) {
    throw new Error(
      `Shopify mutation compilation exception: ${JSON.stringify(json.errors)}`,
    );
  }

  const payload = json.data?.productUpdate;
  if (!payload) {
    throw new Error(
      "Empty execution payload response state returned from destination GraphQL boundary",
    );
  }

  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(
      `Shopify explicit client error context: ${payload.userErrors.map((e) => e.message).join(", ")}`,
    );
  }

  return payload.product;
}

// getProductIds now requires db
const getProductIds = async (
  options: ProductUpdateOptions = {},
  db: D1Database,
): Promise<ProductDbRow[]> => {
  const {
    limit = 500,
    order = "DESC",
    sortBy = "created_at",
    productIds,
  } = options;

  if (productIds && productIds.length > 0) {
    const allResults: ProductDbRow[] = [];
    const chunkSize = 100;
    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => "?").join(",");
      const query = `SELECT id, shopify_id FROM products WHERE id IN (${placeholders})`;
      const results = (await executeQuery(query, chunk, db)) as ProductDbRow[];
      if (results && results.length) {
        allResults.push(...results);
      }
    }
    return allResults;
  }

  let query = `SELECT id, shopify_id FROM products`;
  const params: any[] = [];
  query += ` ORDER BY ${sortBy} ${order}`;
  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }
  return (await executeQuery(query, params, db)) as ProductDbRow[];
};

export async function updateProductDescriptions(
  options: ProductUpdateOptions = {},
): Promise<UpdateProductsResponse> {
  // 1. Fetch the D1 binding
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;

  const startedAt = new Date().toISOString();

  try {
    // 2. Pass db to getProductIds
    const products = await getProductIds(options, db);

    if (!products || products.length === 0) {
      return {
        success: false,
        message: "Empty index scope target set evaluated. No updates deployed.",
        results: [],
        errors: [],
        stats: {
          total: 0,
          successful: 0,
          failed: 0,
          startedAt,
          finishedAt: new Date().toISOString(),
        },
      };
    }

    const results: ProductUpdateResult[] = [];
    const errors: ProductUpdateResult[] = [];
    let processedCount = 0;

    for (const product of products) {
      processedCount++;
      try {
        if (!product.shopify_id) {
          errors.push({
            productId: product.id,
            shopifyId: null,
            success: false,
            error: "No shopify_id key relation mapped to row layout instance",
          });
          continue;
        }

        const fullHtmlString = await generateProductHTML(String(product.id));
        const htmlString = extractProductDetails(fullHtmlString);
        const shopifyProductGid = toShopifyProductGid(product.shopify_id);

        const updatedProduct = await updateShopifyProductDescription(
          shopifyProductGid,
          htmlString,
        );

        results.push({
          productId: product.id,
          shopifyId: product.shopify_id,
          shopifyGid: shopifyProductGid,
          success: true,
          title: updatedProduct.title,
        });

        const delayMs = options.delayMs ?? 100;
        if (delayMs > 0 && processedCount < products.length) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        errors.push({
          productId: product.id,
          shopifyId: product.shopify_id ?? undefined,
          success: false,
          error:
            error.message || "Failed processing item node transformation chain",
        });
      }
    }

    return {
      success: true,
      message: `Processed bulk synchronization modification payload sweep sequence completed successfully`,
      results,
      errors,
      stats: {
        total: products.length,
        successful: results.length,
        failed: errors.length,
        startedAt,
        finishedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error.message ||
        "Fatal sub-system process worker task crash execution fault",
      results: [],
      errors: [{ productId: "system", success: false, error: error.message }],
      stats: {
        total: 0,
        successful: 0,
        failed: 1,
        startedAt,
        finishedAt: new Date().toISOString(),
      },
    };
  }
}

export async function updateSingleProductDescription(
  productId: string | number,
  options: Omit<ProductUpdateOptions, "productIds"> = {},
): Promise<ProductUpdateResult> {
  try {
    const result = await updateProductDescriptions({
      ...options,
      productIds: [productId],
    });
    return (
      result.results[0] ||
      result.errors[0] || {
        productId,
        success: false,
        error: "Unknown missing execution state error",
      }
    );
  } catch (error: any) {
    return { productId, success: false, error: error.message };
  }
}

export async function batchUpdateProductDescriptions(
  productIds: (string | number)[],
  options: Omit<ProductUpdateOptions, "productIds"> = {},
): Promise<UpdateProductsResponse> {
  return updateProductDescriptions({ ...options, productIds });
}
