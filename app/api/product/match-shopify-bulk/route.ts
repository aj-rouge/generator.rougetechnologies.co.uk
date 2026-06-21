// app/api/products/bulk-match/route.ts
import { NextRequest, NextResponse } from "next/server";
import { executeBatch, executeQuery } from "../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const SHOPIFY_API_VERSION = "2026-01";
const DB_CHUNK_SIZE = 100;
const SHOPIFY_PARALLEL_LIMIT = 5;

interface BulkMatchRequestBody {
  action?: "preview" | "apply";
  productIds?: string[];
  matches?: Array<{
    productId: string;
    shopify_id: string;
  }>;
}

interface ShopifyGraphQLResponse {
  data?: {
    products?: {
      edges?: Array<{
        node?: {
          id: string;
          title: string;
        };
      }>;
    };
  };
  errors?: any[];
}

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

    try {
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

      if (!response.ok) return null;

      const result = (await response.json()) as ShopifyGraphQLResponse;
      if (result.errors) return null;

      return result.data?.products?.edges?.[0]?.node || null;
    } catch {
      return null;
    }
  }

  // Search by SKU
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

  // Fallback to Title Exact Match
  if (title) {
    const productNode = await searchShopify(`title:${title}`);
    if (productNode) {
      const shopifyId = productNode.id.split("/").pop();
      const isExact = productNode.title.toLowerCase() === title.toLowerCase();
      return {
        productId: id,
        success: true,
        shopify_id: shopifyId,
        matchMethod: isExact ? "exact title" : "fuzzy title",
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
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  try {
    const body = (await request.json()) as BulkMatchRequestBody;
    const { action, productIds, matches } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing 'action' parameter" },
        { status: 400 },
      );
    }

    // ==========================================
    // ACTION: PREVIEW
    // ==========================================
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

      const products: any[] = [];
      for (let i = 0; i < productIds.length; i += DB_CHUNK_SIZE) {
        const chunk = productIds.slice(i, i + DB_CHUNK_SIZE);
        const placeholders = chunk.map(() => "?").join(",");
        const chunkProducts = await executeQuery(
          `SELECT id, sku, title FROM products WHERE id IN (${placeholders}) AND (shopify_id IS NULL OR shopify_id = '')`,
          chunk,
          db, // <-- pass db
        );
        products.push(...chunkProducts);
      }

      if (products.length === 0) {
        return NextResponse.json({ results: [] });
      }

      const results = [];
      for (let i = 0; i < products.length; i += SHOPIFY_PARALLEL_LIMIT) {
        const parallelChunk = products.slice(i, i + SHOPIFY_PARALLEL_LIMIT);
        const chunkPromises = parallelChunk.map((product) =>
          matchSingleProduct(product),
        );
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      return NextResponse.json({ results });
    }

    // ==========================================
    // ACTION: APPLY
    // ==========================================
    if (action === "apply") {
      if (!matches || !Array.isArray(matches)) {
        return NextResponse.json(
          { error: "matches array required" },
          { status: 400 },
        );
      }

      const statementsQueue: Array<{ sql: string; params: any[] }> = [];
      const updatedTrackingList: Array<{
        productId: string;
        shopify_id: string;
      }> = [];

      for (const m of matches) {
        const { productId, shopify_id } = m;
        if (!productId || !shopify_id) continue;

        statementsQueue.push({
          sql: `UPDATE products SET shopify_id = ?, updated_at = unixepoch() WHERE id = ?`,
          params: [shopify_id, productId],
        });

        updatedTrackingList.push({ productId, shopify_id });
      }

      if (statementsQueue.length > 0) {
        await executeBatch(statementsQueue, db); // <-- pass db
      }

      return NextResponse.json({ success: true, updated: updatedTrackingList });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Bulk match runtime error:", error);
    return NextResponse.json(
      { error: error.message, results: [] },
      { status: 500 },
    );
  }
}
