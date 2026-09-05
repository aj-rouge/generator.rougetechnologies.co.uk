// app/page.tsx
import { Suspense } from "react";
import { getRecentProducts } from "../utils/d1/getRecentProducts";
import { getCategories } from "../utils/d1/category/getCategories";
import ProductsDashboardClient from "../components/ProductsDashboardClient";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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

// ------------------------------------------------------------------
// Skeleton fallback component
// ------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen">
      {/* Header */}
      <div className="w-full flex justify-between items-center gap-3">
        <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="flex gap-2 items-center">
          <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Search bar placeholder */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Product grid skeleton */}
      <div className="w-full max-w-6xl grid gap-2 grid-cols-1 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[200px] sm:h-[224px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------
export default async function Page(props: { searchParams: SearchParams }) {
  try {
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
      db,
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
      <Suspense fallback={<DashboardSkeleton />}>
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
