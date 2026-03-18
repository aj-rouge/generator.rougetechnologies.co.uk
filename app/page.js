import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import SearchBar from "./components/header/search/SearchBar";
import RecentUpdates from "./components/header/search/RecentUpdates";
import { DarkModeToggle } from "./components/header/DarkModeToggle";

const page = async () => {
  return (
    <div className="relative flex flex-col items-center gap-4 p-4 min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Top Action Bar */}
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
        <RecentUpdates />
      </div>
    </div>
  );
};

export default page;
