"use server";

import * as cheerio from "cheerio";
import { executeQuery } from "../utils/d1/execute/executeQuery";
import { generateProductHTML } from "../utils/htmlGenerator/generateProductHTML";

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

// Types
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

// Helper to convert Shopify ID to GID format
function toShopifyProductGid(shopifyId: string | number): string {
  const idStr = String(shopifyId);
  if (idStr.startsWith("gid://shopify/Product/")) {
    return idStr;
  }
  return `gid://shopify/Product/${idStr}`;
}

// Function to update product description via Shopify GraphQL
async function updateShopifyProductDescription(
  shopifyProductGid: string,
  htmlDescription: string,
) {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    throw new Error(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN",
    );
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

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      `Shopify GraphQL HTTP error ${response.status}: ${JSON.stringify(json)}`,
    );
  }

  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const payload = json.data?.productUpdate;
  if (!payload) {
    throw new Error(`Missing productUpdate payload: ${JSON.stringify(json)}`);
  }

  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(
      `Shopify user errors: ${payload.userErrors.map((e: any) => e.message).join(", ")}`,
    );
  }

  return payload.product;
}

// Function to extract only the product details section from the full HTML
function extractProductDetails(htmlString: string): string {
  try {
    const $ = cheerio.load(htmlString);

    // Find the details div
    const detailsDiv = $(".rouge-technologies-details");

    if (detailsDiv.length === 0) {
      return htmlString; // Return full HTML if not found
    }

    // Remove all checkmark spans
    detailsDiv.find("span.rouge-technologies-details__checkmark").remove();

    // Get the HTML of the details div
    const cleanedDetailsHtml = $.html(detailsDiv);

    return cleanedDetailsHtml;
  } catch (error: any) {
    console.error(`Error extracting details: ${error.message}`);
    return htmlString; // Return full HTML on error
  }
}

// Get product IDs from database
const getProductIds = async (options: ProductUpdateOptions = {}) => {
  const {
    limit = 500,
    order = "DESC",
    sortBy = "created_at",
    productIds,
  } = options;

  // If specific product IDs are provided, use them
  if (productIds && productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const query = `SELECT id, shopify_id FROM products WHERE id IN (${placeholders})`;
    const results = await executeQuery(query, productIds);
    return results || [];
  }

  // Otherwise fetch all with limit
  let query = `SELECT id, shopify_id FROM products`;
  const params: any[] = [];

  query += ` ORDER BY ${sortBy} ${order}`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  const results = await executeQuery(query, params);
  return results || [];
};

// Main action to update product descriptions
export async function updateProductDescriptions(
  options: ProductUpdateOptions = {},
): Promise<UpdateProductsResponse> {
  const startedAt = new Date().toISOString();
  console.log("🚀 Starting Shopify description auto-update process...");
  console.log(`⏰ Started at: ${startedAt}`);

  try {
    // Get product IDs
    console.log("📋 Fetching product IDs from database...");
    const products = await getProductIds(options);

    if (!products || products.length === 0) {
      console.log("❌ No products found in database");
      return {
        success: false,
        message: "No products found",
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

    console.log(`✅ Retrieved ${products.length} products from database`);

    const results: ProductUpdateResult[] = [];
    const errors: ProductUpdateResult[] = [];
    let processedCount = 0;

    // Update each product
    for (const product of products) {
      processedCount++;
      console.log(
        `\n🔄 Processing product ${processedCount}/${products.length}`,
      );

      try {
        if (!product.shopify_id) {
          console.log(
            `⚠️  Product ${product.id} has no shopify_id, skipping...`,
          );
          errors.push({
            productId: product.id,
            shopifyId: product.shopify_id,
            success: false,
            error: "No shopify_id found",
          });
          continue;
        }

        console.log(`📝 Generating HTML for product ${product.id}...`);
        const fullHtmlString = await generateProductHTML(product.id);

        // Extract only the product details section
        const htmlString = extractProductDetails(fullHtmlString);

        // Build Shopify product GID from product.shopify_id
        const shopifyProductGid = toShopifyProductGid(product.shopify_id);

        console.log(
          `📤 Sending update to Shopify for product ${shopifyProductGid}...`,
        );

        // Call Shopify Admin GraphQL to update descriptionHtml
        const updatedProduct = await updateShopifyProductDescription(
          shopifyProductGid,
          htmlString,
        );

        console.log(
          `✅ Successfully updated product ${product.id} on Shopify: ${updatedProduct.title}`,
        );
        results.push({
          productId: product.id,
          shopifyId: product.shopify_id,
          shopifyGid: shopifyProductGid,
          success: true,
          title: updatedProduct.title,
        });

        // Optional delay to avoid rate limiting
        const delayMs = options.delayMs || 100;
        if (delayMs > 0 && processedCount < products.length) {
          console.log(`⏳ Waiting ${delayMs}ms before next request...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        console.log(
          `❌ Error processing product ${product.id}:`,
          error.message,
        );
        errors.push({
          productId: product.id,
          shopifyId: product.shopify_id,
          success: false,
          error: error.message,
        });
      }
    }

    const finishedAt = new Date().toISOString();
    console.log(`\n🎉 Update process completed!`);
    console.log(`✅ Successfully updated: ${results.length} products`);
    console.log(`❌ Failed updates: ${errors.length} products`);
    console.log(`⏰ Finished at: ${finishedAt}`);

    return {
      success: true,
      message: `Updated ${results.length} products, ${errors.length} failed`,
      results,
      errors,
      stats: {
        total: products.length,
        successful: results.length,
        failed: errors.length,
        startedAt,
        finishedAt,
      },
    };
  } catch (error: any) {
    console.error("💥 Shopify HTML Update Error:", error);
    return {
      success: false,
      message: error.message,
      results: [],
      errors: [
        {
          productId: "system",
          success: false,
          error: error.message,
        },
      ],
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

// Single product update action
export async function updateSingleProductDescription(
  productId: string | number,
  options: Omit<ProductUpdateOptions, "productIds"> = {},
): Promise<ProductUpdateResult> {
  try {
    const result = await updateProductDescriptions({
      ...options,
      productIds: [productId],
    });

    if (result.results.length > 0) {
      return result.results[0];
    }

    if (result.errors.length > 0) {
      return result.errors[0];
    }

    return {
      productId,
      success: false,
      error: "Product not found or could not be updated",
    };
  } catch (error: any) {
    return {
      productId,
      success: false,
      error: error.message,
    };
  }
}

// Batch update action
export async function batchUpdateProductDescriptions(
  productIds: (string | number)[],
  options: Omit<ProductUpdateOptions, "productIds"> = {},
): Promise<UpdateProductsResponse> {
  return updateProductDescriptions({
    ...options,
    productIds,
  });
}
