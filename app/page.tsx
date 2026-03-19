import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DarkModeToggle } from "./components/header/DarkModeToggle";
import RecentProducts from "./components/recent/RecentProducts";
import { getRecentProducts } from "./utils/d1/getRecentProducts";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Page(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;

  // Parse search params for initial filters
  const limit = Math.min(Math.max(Number(searchParams.limit) || 10, 1), 100);
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

  // Fetch initial data on the server
  const initialProducts = await getRecentProducts({
    limit,
    order: sortOrder,
    category,
    sortBy,
  });

  return (
    <div className="relative flex flex-col items-center gap-4 p-4 min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <div className="absolute top-4 right-4 md:top-4 md:right-6 flex items-center gap-3">
        <DarkModeToggle />

        <Link
          href="/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Product</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="mt-16 w-full flex flex-col items-center gap-4">
        <RecentProducts initialProducts={initialProducts} />
      </div>
    </div>
  );
}
