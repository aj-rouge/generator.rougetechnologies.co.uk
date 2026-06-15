// app/page.tsx
import { Suspense } from "react";
import { getRecentProducts } from "../utils/d1/getRecentProducts";
import { getCategories } from "../utils/d1/category/getCategories";
import ProductsDashboardClient from "../components/ProductsDashboardClient";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Metadata for SEO
export const metadata = {
  title: "Product Dashboard",
  description:
    "Browse and manage your products with advanced filtering and sorting.",
};

// Helper to safely parse integer from search param
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
  const searchParams = await props.searchParams;

  // Parse basic params with safe defaults
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

  // Parse count filters from URL (with NaN protection)
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

  // Fetch data in parallel
  const [categories, initialProducts] = await Promise.all([
    getCategories(),
    getRecentProducts({
      limit,
      order: sortOrder,
      category,
      sortBy,
      countFilters,
    }),
  ]);

  return (
    <Suspense fallback={<div className="p-4">Loading dashboard...</div>}>
      <ProductsDashboardClient
        initialProducts={initialProducts}
        categories={categories}
        initialCountFilters={countFilters}
      />
    </Suspense>
  );
}
