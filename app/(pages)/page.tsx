// app/page.tsx
import { Suspense } from "react";
import { getRecentProducts } from "../utils/d1/getRecentProducts";
import { getCategories } from "../utils/d1/category/getCategories";
import ProductsDashboardClient from "../components/ProductsDashboardClient";
import { getCloudflareContext } from "@opennextjs/cloudflare"; // <-- add import

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Product Dashboard",
  description:
    "Browse and manage your products with advanced filtering and sorting.",
};

function parseIntParam(
  value: string | string[] | undefined,
  defaultValue: number,
): number {
  if (!value) return defaultValue;
  const parsed =
    typeof value === "string" ? parseInt(value, 10) : parseInt(value[0], 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export default async function Page(props: { searchParams: SearchParams }) {
  try {
    // 1. Fetch the D1 binding at the start
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const searchParams = await props.searchParams;

    const limit = Math.min(
      Math.max(parseIntParam(searchParams.limit, 10), 1),
      500,
    );
    const sortBy = (
      searchParams.sortBy === "created_at" ? "created_at" : "updated_at"
    ) as "updated_at" | "created_at";
    const sortOrder = (searchParams.sortOrder === "ASC" ? "ASC" : "DESC") as
      | "ASC"
      | "DESC";
    const category =
      typeof searchParams.category === "string"
        ? searchParams.category
        : undefined;

    const minImages = parseIntParam(searchParams.minImages, undefined);
    const maxImages = parseIntParam(searchParams.maxImages, undefined);
    const minSpecs = parseIntParam(searchParams.minSpecs, undefined);
    const maxSpecs = parseIntParam(searchParams.maxSpecs, undefined);
    const minParagraphs = parseIntParam(searchParams.minParagraphs, undefined);
    const maxParagraphs = parseIntParam(searchParams.maxParagraphs, undefined);
    const minFeatures = parseIntParam(searchParams.minFeatures, undefined);
    const maxFeatures = parseIntParam(searchParams.maxFeatures, undefined);
    const minFeedbacks = parseIntParam(searchParams.minFeedbacks, undefined);
    const maxFeedbacks = parseIntParam(searchParams.maxFeedbacks, undefined);

    const countFilters = {
      image_count: { min: minImages, max: maxImages },
      specs_count: { min: minSpecs, max: maxSpecs },
      paragraphs_count: { min: minParagraphs, max: maxParagraphs },
      features_count: { min: minFeatures, max: maxFeatures },
      feedbacks_count: { min: minFeedbacks, max: maxFeedbacks },
    };

    console.log("[Page] Fetching data with params:", {
      limit,
      sortBy,
      sortOrder,
      category,
      countFilters,
    });

    // 2. Pass `db` to both promises
    const categoriesPromise = getCategories({ db }).catch((err) => {
      console.error("[Page] ❌ getCategories failed:", err);
      throw err;
    });
    const productsPromise = getRecentProducts({
      limit,
      order: sortOrder,
      category,
      sortBy,
      countFilters,
      db, // <-- pass db
    }).catch((err) => {
      console.error("[Page] ❌ getRecentProducts failed:", err);
      throw err;
    });

    const [categories, initialProducts] = await Promise.all([
      categoriesPromise,
      productsPromise,
    ]);

    console.log("[Page] categories count:", categories?.length);
    console.log(
      "[Page] first category sample:",
      categories?.[0] ? JSON.stringify(categories[0]).slice(0, 200) : "none",
    );
    console.log("[Page] products count:", initialProducts?.length);
    console.log(
      "[Page] first product sample:",
      initialProducts?.[0]
        ? JSON.stringify(initialProducts[0]).slice(0, 200)
        : "none",
    );

    return (
      <Suspense fallback={<div className="p-4">Loading dashboard...</div>}>
        <ProductsDashboardClient
          initialProducts={initialProducts}
          categories={categories}
          initialCountFilters={countFilters}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("[Page] ❌ Unhandled error in Page:", error);
    throw error;
  }
}
