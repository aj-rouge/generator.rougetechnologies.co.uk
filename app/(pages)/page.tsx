// app/page.tsx

import Link from "next/link";
import { Plus, LogOut } from "lucide-react";
import { Suspense } from "react";
import { DarkModeToggle } from "../components/header/DarkModeToggle";
import RecentProducts from "../components/recent/RecentProducts";
import { getRecentProducts } from "../utils/d1/getRecentProducts";
import { getCategories } from "../utils/d1/category/getCategories";
import SearchBar from "../components/search/SearchBar";
import { logout } from "../actions/auth";

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
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="w-full flex justify-between items-center gap-3">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
        <DarkModeToggle />
        <Link
          href="/create"
          className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Product</span>
        </Link>
      </div>

      <div className="w-full flex flex-col items-center gap-4">
        {/* Suspense for search bar (may read search params) */}
        <Suspense
          fallback={
            <div className="h-12 w-full animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg" />
          }
        >
          <SearchBar />
        </Suspense>

        {/* Suspense for product list (streams initial data) */}
        <Suspense
          fallback={
            <div className="w-full h-96 animate-pulse bg-gray-100 dark:bg-gray-900 rounded-xl" />
          }
        >
          <RecentProducts
            initialProducts={initialProducts}
            categories={categories}
            initialCountFilters={countFilters}
          />
        </Suspense>
      </div>
    </div>
  );
}
