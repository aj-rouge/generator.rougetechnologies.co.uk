// app/api/product/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getRecentProducts,
  IdentifierField,
  IdentifierRule,
} from "../../../utils/d1/getRecentProducts";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  // Fetch the D1 binding
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;

  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit") || "10";
  const offsetParam = searchParams.get("offset") || "0";
  const sortByParam = searchParams.get("sortBy") || "updated_at";
  const sortOrderParam = searchParams.get("sortOrder") || "DESC";
  const categoryParam = searchParams.get("category") || undefined;
  const identifierRulesParam = searchParams.get("identifierRules") || "{}";

  const minImages = searchParams.get("minImages");
  const maxImages = searchParams.get("maxImages");
  const minSpecs = searchParams.get("minSpecs");
  const maxSpecs = searchParams.get("maxSpecs");
  const minParagraphs = searchParams.get("minParagraphs");
  const maxParagraphs = searchParams.get("maxParagraphs");
  const minFeatures = searchParams.get("minFeatures");
  const maxFeatures = searchParams.get("maxFeatures");
  const minFeedbacks = searchParams.get("minFeedbacks");
  const maxFeedbacks = searchParams.get("maxFeedbacks");
  const draftParam = searchParams.get("draft") === "true";

  const countFilters = {
    image_count: {
      min: minImages ? parseInt(minImages, 10) : undefined,
      max: maxImages ? parseInt(maxImages, 10) : undefined,
    },
    specs_count: {
      min: minSpecs ? parseInt(minSpecs, 10) : undefined,
      max: maxSpecs ? parseInt(maxSpecs, 10) : undefined,
    },
    paragraphs_count: {
      min: minParagraphs ? parseInt(minParagraphs, 10) : undefined,
      max: maxParagraphs ? parseInt(maxParagraphs, 10) : undefined,
    },
    features_count: {
      min: minFeatures ? parseInt(minFeatures, 10) : undefined,
      max: maxFeatures ? parseInt(maxFeatures, 10) : undefined,
    },
    feedbacks_count: {
      min: minFeedbacks ? parseInt(minFeedbacks, 10) : undefined,
      max: maxFeedbacks ? parseInt(maxFeedbacks, 10) : undefined,
    },
  };

  try {
    const limit = Math.min(Math.max(parseInt(limitParam), 1), 500);
    const offset = Math.max(parseInt(offsetParam), 0);
    const sortBy = sortByParam as "updated_at" | "created_at";
    const sortOrder = sortOrderParam as "ASC" | "DESC";

    let identifierRules: Partial<Record<IdentifierField, IdentifierRule>> = {};
    try {
      identifierRules = JSON.parse(identifierRulesParam);
    } catch (e) {
      console.warn("Invalid identifierRules JSON, using empty object");
    }

    // Pass `db` to getRecentProducts
    const products = await getRecentProducts({
      limit,
      offset,
      order: sortOrder,
      category: categoryParam,
      sortBy,
      identifierRules,
      countFilters,
      db,
      draft: draftParam,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[API] Failed to fetch recent products:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent products" },
      { status: 500 },
    );
  }
}
