// components/ProductsDashboardClient.tsx
"use client";

import Link from "next/link";
import { Plus, LogOut, FileText, LayoutDashboard } from "lucide-react";
import { DarkModeToggle } from "./header/DarkModeToggle";
import RecentProducts from "./recent/RecentProducts";
import SearchBar from "./search/SearchBar";

interface ProductsDashboardClientProps {
  initialProducts: any[];
  categories: any[];
  initialCountFilters: any;
}

export default function ProductsDashboardClient({
  initialProducts,
  categories,
  initialCountFilters,
}: ProductsDashboardClientProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen">
      {/* Header with logout and sync buttons */}
      <div className="w-full flex justify-between items-center gap-3">
        <form
          action={async () => {
            const { logout } = await import("../actions/auth");
            await logout();
          }}
        >
          <button className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>

        <div className="flex gap-2 flex-wrap items-center">
          <Link
            href="/prompts"
            className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Manage Prompts</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <DarkModeToggle />
          <Link
            href="/create"
            className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Product</span>
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-4">
        <SearchBar />
        <RecentProducts
          initialProducts={initialProducts}
          categories={categories}
        />
      </div>
    </div>
  );
}
