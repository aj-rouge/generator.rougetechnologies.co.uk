// app/page.tsx
import React from "react";
import Link from "next/link";
import { Plus, LogOut } from "lucide-react";
import { DarkModeToggle } from "../components/header/DarkModeToggle";
import RecentProducts from "../components/recent/RecentProducts";
import { getRecentProducts } from "../utils/d1/getRecentProducts";
import { getCategories } from "../utils/d1/category/getCategories";
import SearchBar from "../components/search/SearchBar";
import { logout } from "../actions/auth";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Page(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;

  const limit = Math.min(Math.max(Number(searchParams.limit) || 10, 1), 500);
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

  // Parse count filters from URL (optional)
  const minImages = searchParams.minImages
    ? parseInt(searchParams.minImages as string, 10)
    : undefined;
  const maxImages = searchParams.maxImages
    ? parseInt(searchParams.maxImages as string, 10)
    : undefined;
  // ... similarly for other fields

  const countFilters = {
    image_count: { min: minImages, max: maxImages },
    specs_count: {
      min: searchParams.minSpecs
        ? parseInt(searchParams.minSpecs as string, 10)
        : undefined,
      max: searchParams.maxSpecs
        ? parseInt(searchParams.maxSpecs as string, 10)
        : undefined,
    },
    paragraphs_count: {
      min: searchParams.minParagraphs
        ? parseInt(searchParams.minParagraphs as string, 10)
        : undefined,
      max: searchParams.maxParagraphs
        ? parseInt(searchParams.maxParagraphs as string, 10)
        : undefined,
    },
    features_count: {
      min: searchParams.minFeatures
        ? parseInt(searchParams.minFeatures as string, 10)
        : undefined,
      max: searchParams.maxFeatures
        ? parseInt(searchParams.maxFeatures as string, 10)
        : undefined,
    },
    feedbacks_count: {
      min: searchParams.minFeedbacks
        ? parseInt(searchParams.minFeedbacks as string, 10)
        : undefined,
      max: searchParams.maxFeedbacks
        ? parseInt(searchParams.maxFeedbacks as string, 10)
        : undefined,
    },
  };

  const categories = await getCategories();

  const initialProducts = await getRecentProducts({
    limit,
    order: sortOrder,
    category,
    sortBy,
    countFilters,
  });

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen transition-colors duration-300">
      {/* Header unchanged */}
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
        <SearchBar />
        <RecentProducts
          initialProducts={initialProducts}
          categories={categories}
          initialCountFilters={countFilters}
        />
      </div>
    </div>
  );
}
