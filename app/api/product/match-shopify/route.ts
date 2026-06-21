// app/api/product/match-shopify/route.ts
import { NextResponse } from "next/server";
import { executeQuery } from "../../../utils/d1/execute";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const SHOPIFY_API_VERSION = "2026-01";

interface MatchShopifyRequestBody {
  sku?: string;
  title?: string;
}

interface ProductRow {
  id: string;
  title: string;
  shopify_id: string | null;
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

function isValidShopifyId(value: any): boolean {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "NULL") return false;
  return /^\d+$/.test(trimmed);
}

export async function POST(request: Request) {
  // 1. Fetch the D1 binding at the start
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  try {
    const { sku, title } = (await request.json()) as MatchShopifyRequestBody;

    if (!sku) {
      return NextResponse.json(
        { error: "SKU parameter is required" },
        { status: 400 },
      );
    }

    // 2. Locate product – pass db
    const localProducts = (await executeQuery(
      `SELECT id, title, shopify_id FROM products WHERE sku = ?`,
      [sku],
      db,
    )) as ProductRow[];

    if (!localProducts || localProducts.length === 0) {
      return NextResponse.json(
        { error: `No local product found matching SKU: ${sku}` },
        { status: 404 },
      );
    }

    const localProduct = localProducts[0];
    const hasValidId = isValidShopifyId(localProduct.shopify_id);

    if (hasValidId) {
      return NextResponse.json({
        success: true,
        message: "Product already linked to Shopify",
        shopify_id: localProduct.shopify_id,
      });
    }

    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
    if (!shopDomain || !accessToken) {
      throw new Error("Missing Shopify credentials");
    }

    // 3. Query Shopify by SKU
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
      throw new Error(`Shopify GraphQL error: ${response.status}`);
    }

    const result = (await response.json()) as ShopifyGraphQLResponse;
    if (result.errors) {
      throw new Error(`Shopify errors: ${JSON.stringify(result.errors)}`);
    }

    const productsEdges = result.data?.products?.edges || [];
    let shopifyProduct = null;
    let matchMethod = null;

    if (productsEdges.length > 0) {
      shopifyProduct = productsEdges[0].node;
      matchMethod = "SKU (GraphQL)";
    } else if (title) {
      // 4. Title fallback
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
        throw new Error(`Shopify Title search error: ${titleResponse.status}`);
      }

      const titleResult =
        (await titleResponse.json()) as ShopifyGraphQLResponse;
      const titleEdges = titleResult.data?.products?.edges || [];

      if (titleEdges.length > 0) {
        const exactMatch = titleEdges.find(
          (edge) => edge.node?.title.toLowerCase() === title.toLowerCase(),
        );
        if (exactMatch) {
          shopifyProduct = exactMatch.node;
          matchMethod = "title (exact)";
        } else {
          shopifyProduct = titleEdges[0].node;
          matchMethod = "title (fuzzy)";
        }
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

    const shopifyGid = shopifyProduct.id;
    const shopifyId = shopifyGid.split("/").pop();

    // 5. Persist update – pass db
    await executeQuery(
      `UPDATE products SET shopify_id = ?, updated_at = unixepoch() WHERE id = ?`,
      [shopifyId, localProduct.id],
      db,
    );

    return NextResponse.json({
      success: true,
      message: `Linked Shopify product ${shopifyId} (matched by ${matchMethod})`,
      shopify_id: shopifyId,
      matchMethod,
    });
  } catch (error: any) {
    console.error("💥 [match-shopify] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 },
    );
  }
}
