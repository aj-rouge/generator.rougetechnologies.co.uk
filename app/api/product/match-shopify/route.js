// app/api/product/match-shopify/route.js
import { NextResponse } from "next/server";
import { executeQuery } from "../../../utils/d1/execute/executeQuery";

const SHOPIFY_API_VERSION = "2026-01";

function isValidShopifyId(value) {
  if (!value) return false;
  if (typeof value !== "string") return !!value;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "NULL") return false;
  return /^\d+$/.test(trimmed);
}

export async function POST(request) {
  console.log("🔍 [match-shopify] API called");

  try {
    const { sku, title } = await request.json();
    console.log(`📦 Request payload:`, { sku, title });

    if (!sku) {
      return NextResponse.json({ error: "SKU is required" }, { status: 400 });
    }

    // 1. Find local product by SKU
    const localProducts = await executeQuery(
      `SELECT id, title, shopify_id FROM products WHERE sku = ?`,
      [sku],
    );

    if (localProducts.length === 0) {
      return NextResponse.json(
        { error: `No local product found with SKU: ${sku}` },
        { status: 404 },
      );
    }

    const localProduct = localProducts[0];
    const hasValidId = isValidShopifyId(localProduct.shopify_id);

    console.log(`✅ Local product found:`, {
      id: localProduct.id,
      title: localProduct.title,
      raw_shopify_id: localProduct.shopify_id,
      hasValidId,
    });

    if (hasValidId) {
      return NextResponse.json({
        success: true,
        message: "Product already has Shopify ID",
        shopify_id: localProduct.shopify_id,
      });
    }

    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
    if (!shopDomain || !accessToken) {
      throw new Error("Missing Shopify credentials");
    }

    // 2. Use GraphQL to search by SKU
    const graphqlQuery = `
      query ($sku: String!) {
        products(first: 1, query: $sku) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;

    // The query string expects format: "sku:ABC123"
    const queryString = `sku:${sku}`;

    const response = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { sku: queryString },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`GraphQL error: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const productsEdges = result.data?.products?.edges || [];
    let shopifyProduct = null;
    let matchMethod = null;

    if (productsEdges.length > 0) {
      shopifyProduct = productsEdges[0].node;
      matchMethod = "SKU (GraphQL)";
      console.log(
        `✅ Match found by SKU: ${shopifyProduct.id} - "${shopifyProduct.title}"`,
      );
    } else if (title) {
      // Fallback: search by title
      const titleQuery = `
        query ($title: String!) {
          products(first: 1, query: $title) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `;
      const titleQueryString = `title:${title}`;
      const titleResponse = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: titleQuery,
            variables: { title: titleQueryString },
          }),
        },
      );

      if (!titleResponse.ok) {
        throw new Error(`Title search GraphQL error: ${titleResponse.status}`);
      }

      const titleResult = await titleResponse.json();
      const titleEdges = titleResult.data?.products?.edges || [];

      if (titleEdges.length > 0) {
        // Filter for exact match (case-insensitive)
        const exactMatch = titleEdges.find(
          (edge) => edge.node.title.toLowerCase() === title.toLowerCase(),
        );
        if (exactMatch) {
          shopifyProduct = exactMatch.node;
          matchMethod = "title (exact)";
        } else {
          shopifyProduct = titleEdges[0].node;
          matchMethod = "title (fuzzy)";
        }
        console.log(
          `✅ Fallback match by title: ${shopifyProduct.id} - "${shopifyProduct.title}"`,
        );
      }
    }

    if (!shopifyProduct) {
      return NextResponse.json(
        {
          error: `No product found in Shopify with SKU: ${sku}${title ? ` or title: ${title}` : ""}`,
        },
        { status: 404 },
      );
    }

    // Extract numeric ID from GID
    const shopifyGid = shopifyProduct.id; // e.g., "gid://shopify/Product/1234567890"
    const shopifyId = shopifyGid.split("/").pop();

    // Update local database
    await executeQuery(
      `UPDATE products SET shopify_id = ?, updated_at = unixepoch() WHERE id = ?`,
      [shopifyId, localProduct.id],
    );
    console.log(
      `✅ Database updated: product ${localProduct.id} -> Shopify ID ${shopifyId}`,
    );

    return NextResponse.json({
      success: true,
      message: `Linked Shopify product ${shopifyId} (matched by ${matchMethod})`,
      shopify_id: shopifyId,
      matchMethod,
    });
  } catch (error) {
    console.error("💥 [match-shopify] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
