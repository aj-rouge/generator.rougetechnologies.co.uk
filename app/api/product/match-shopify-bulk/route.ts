import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../../utils/d1/execute/executeQuery";
const SHOPIFY_API_VERSION = "2026-01";
const CHUNK_SIZE = 100; // D1 safe limit for SQL variables

async function matchSingleProduct(product: {
  id: string;
  sku: string | null;
  title: string;
}) {
  const { id, sku, title } = product;
  if (!sku && !title) {
    return { productId: id, success: false, error: "SKU and title missing" };
  }

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  if (!shopDomain || !accessToken) {
    throw new Error("Missing Shopify credentials");
  }

  async function searchShopify(query: string) {
    const graphqlQuery = `
      query ($queryString: String!) {
        products(first: 1, query: $queryString) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;
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
          variables: { queryString: query },
        }),
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (result.errors)
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    return result.data?.products?.edges?.[0]?.node || null;
  }

  // 1. Search by SKU
  if (sku) {
    const productNode = await searchShopify(`sku:${sku}`);
    if (productNode) {
      const shopifyId = productNode.id.split("/").pop();
      return {
        productId: id,
        success: true,
        shopify_id: shopifyId,
        matchMethod: "SKU",
        title: productNode.title,
      };
    }
  }

  // 2. Fallback to title exact match (case‑insensitive)
  if (title) {
    const productNode = await searchShopify(`title:${title}`);
    if (
      productNode &&
      productNode.title.toLowerCase() === title.toLowerCase()
    ) {
      const shopifyId = productNode.id.split("/").pop();
      return {
        productId: id,
        success: true,
        shopify_id: shopifyId,
        matchMethod: "exact title",
        title: productNode.title,
      };
    }
    // optional fuzzy match – just return the first result
    if (productNode) {
      const shopifyId = productNode.id.split("/").pop();
      return {
        productId: id,
        success: true,
        shopify_id: shopifyId,
        matchMethod: "fuzzy title",
        title: productNode.title,
      };
    }
  }

  return {
    productId: id,
    success: false,
    error: "No matching product found in Shopify",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productIds } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing 'action' parameter" },
        { status: 400 },
      );
    }

    // ---------- PREVIEW: find matches without updating DB ----------
    if (action === "preview") {
      if (
        !productIds ||
        !Array.isArray(productIds) ||
        productIds.length === 0
      ) {
        return NextResponse.json(
          { error: "productIds array required" },
          { status: 400 },
        );
      }

      // Fetch product details from DB in chunks to avoid too many SQL variables
      const products: any[] = [];
      for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
        const chunk = productIds.slice(i, i + CHUNK_SIZE);
        const placeholders = chunk.map(() => "?").join(",");
        const chunkProducts = await executeQuery(
          `SELECT id, sku, title FROM products WHERE id IN (${placeholders}) AND (shopify_id IS NULL OR shopify_id = '')`,
          chunk,
        );
        products.push(...chunkProducts);
      }

      if (products.length === 0) {
        return NextResponse.json({ results: [] });
      }

      // Match each product sequentially (rate limiting friendly)
      const results = [];
      for (const product of products) {
        const match = await matchSingleProduct(product);
        results.push(match);
      }
      return NextResponse.json({ results });
    }

    // ---------- APPLY: update DB for accepted matches ----------
    if (action === "apply") {
      const { matches } = body;
      if (!matches || !Array.isArray(matches)) {
        return NextResponse.json(
          { error: "matches array required" },
          { status: 400 },
        );
      }

      const updated = [];
      for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
        const chunk = matches.slice(i, i + CHUNK_SIZE);
        for (const m of chunk) {
          const { productId, shopify_id } = m;
          if (!productId || !shopify_id) continue;
          await executeQuery(
            `UPDATE products SET shopify_id = ?, updated_at = unixepoch() WHERE id = ?`,
            [shopify_id, productId],
          );
          updated.push({ productId, shopify_id });
        }
      }
      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Bulk match error:", error);
    // Return a valid structure so frontend doesn't break
    return NextResponse.json(
      { error: error.message, results: [] },
      { status: 500 },
    );
  }
}
