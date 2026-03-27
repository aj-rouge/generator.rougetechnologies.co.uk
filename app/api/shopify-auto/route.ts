"use server";
import { NextResponse } from "next/server";
import { executeQuery } from "../../utils/d1/execute/executeQuery";
import { generateProductHTML } from "../../utils/htmlGenerator/generateProductHTML";
import * as cheerio from "cheerio";

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
    console.log(`🔍 Parsing HTML with cheerio...`);
    const $ = cheerio.load(htmlString);

    // Find the details div
    const detailsDiv = $(".rouge-technologies-details");

    if (detailsDiv.length === 0) {
      console.log(`⚠️  Could not find rouge-technologies-details div`);
      return htmlString; // Return full HTML if not found
    }

    console.log(`✅ Found details div`);

    // Remove all checkmark spans
    detailsDiv.find("span.rouge-technologies-details__checkmark").remove();

    // Get the HTML of the details div
    const cleanedDetailsHtml = $.html(detailsDiv);

    console.log(
      `✅ Extracted details section: ${cleanedDetailsHtml.length} characters`,
    );

    return cleanedDetailsHtml;
  } catch (error: any) {
    console.error(`❌ Error extracting details: ${error.message}`);
    return htmlString; // Return full HTML on error
  }
}

const getProductIds = async (options = {}) => {
  const {
    limit = 500,
    order = "DESC",
    sortBy = "created_at",
  }: { limit?: number; order?: string; sortBy?: string } = options;

  console.log(
    `🔍 Fetching product IDs with limit: ${limit}, order: ${order}, sortBy: ${sortBy}`,
  );

  let query = `SELECT id, shopify_id FROM products`;
  const params: any[] = [];

  query += ` ORDER BY ${sortBy} ${order}`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  console.log(`📝 SQL Query: ${query}`);
  console.log(`📦 SQL Params:`, params);

  const results = await executeQuery(query, params);
  console.log(`✅ Found ${results?.length || 0} products`);

  return results || [];
};

export async function POST() {
  console.log("🚀 Starting Shopify description auto-update process...");
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  try {
    // Get all product IDs
    console.log("📋 Fetching product IDs from database...");
    const products = await getProductIds({ limit: 500 });

    if (!products || products.length === 0) {
      console.log("❌ No products found in database");
      return NextResponse.json({ error: "No products found" }, { status: 404 });
    }

    console.log(`✅ Retrieved ${products.length} products from database`);

    // Log sample of products
    console.log("📊 Sample products:", products.slice(0, 3));

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Update each product
    for (const product of products) {
      processedCount++;
      console.log(
        `\n🔄 Processing product ${processedCount}/${products.length}`,
      );
      console.log(
        `   Product ID: ${product.id}, Shopify ID: ${product.shopify_id || "MISSING"}`,
      );

      try {
        if (!product.shopify_id) {
          console.log(
            `⚠️  Product ${product.id} has no shopify_id, skipping...`,
          );
          errors.push({
            productId: product.id,
            error: "No shopify_id found",
          });
          continue;
        }

        console.log(`📝 Generating HTML for product ${product.id}...`);
        const fullHtmlString = await generateProductHTML(product.id);
        console.log(
          `✅ HTML generated successfully (${fullHtmlString.length} characters)`,
        );

        // Extract only the product details section
        const htmlString = extractProductDetails(fullHtmlString);

        console.log(`📦 Final HTML size: ${htmlString.length} characters`);

        // Optional: Validate that we have content
        if (htmlString.length < 100) {
          console.log(
            `⚠️  Warning: Extracted HTML is very short (${htmlString.length} chars)`,
          );
        }

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

        // Small delay to avoid rate limiting
        console.log(`⏳ Waiting 100ms before next request...`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        console.log(
          `❌ Error processing product ${product.id}:`,
          error.message,
        );
        errors.push({
          productId: product.id,
          shopifyId: product.shopify_id,
          error: error.message,
        });
      }
    }

    console.log(`\n🎉 Update process completed!`);
    console.log(`✅ Successfully updated: ${results.length} products`);
    console.log(`❌ Failed updates: ${errors.length} products`);
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} products, ${errors.length} failed`,
      results,
      errors,
    });
  } catch (error: any) {
    console.error("💥 Shopify HTML Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
