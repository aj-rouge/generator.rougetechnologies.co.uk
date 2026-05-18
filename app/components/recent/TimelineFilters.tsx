"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, RefreshCw, Filter, Clock, X } from "lucide-react";
import { useState, useEffect } from "react";
import { FilterDropdown } from "./FilterDropdown";
import CategoryFilter from "./CategoryFilter";
import { IdentifierRulesFilter } from "./IdentifierRulesFilter";
import {
  IdentifierField,
  IdentifierRule,
} from "../../utils/d1/getRecentProducts";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100 | 200 | 500;

interface TimelineFiltersProps {
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortOrder: SortOrder;
  toggleSortOrder: () => void;
  limit: LimitOption;
  setLimit: (limit: LimitOption) => void;
  loading: boolean;
  fetchRecent: () => void;
  setShowFilters: (show: boolean) => void;
  categories: any[];
  category: string;
  setCategory: (category: string) => void;
  identifierRules: Partial<Record<IdentifierField, IdentifierRule>>;
  setIdentifierRules: (
    rules: Partial<Record<IdentifierField, IdentifierRule>>,
  ) => void;
}

const limitOptions = [5, 10, 20, 50, 100, 200, 500].map((n) => ({
  value: n as LimitOption,
  label: `${n} items`,
}));

const sortOptions = [
  { value: "updated_at", label: "Updated Date" },
  { value: "created_at", label: "Created Date" },
] as const;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}

export const TimelineFilters = ({
  sortField,
  setSortField,
  sortOrder,
  toggleSortOrder,
  limit,
  setLimit,
  loading,
  fetchRecent,
  setShowFilters,
  categories,
  category,
  setCategory,
  identifierRules,
  setIdentifierRules,
}: TimelineFiltersProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (isMobile && isMobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isMobileFiltersOpen]);

  // Desktop view
  if (!isMobile) {
    return (
      <motion.div layout className="flex flex-col gap-3 w-full">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-black rounded-full px-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Recent Products
            </h2>
          </div>
          <CategoryFilter
            value={category}
            onChange={setCategory}
            categories={categories}
          />
          <FilterDropdown
            label={sortOptions.find((o) => o.value === sortField)?.label || ""}
            options={sortOptions}
            selectedValue={sortField}
            onSelect={setSortField}
            Icon={ArrowUpDown}
          />
          <motion.button
            onClick={toggleSortOrder}
            className={`p-1.5 rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
              sortOrder === "ASC"
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:text-white"
            }`}
            whileTap={{ scale: 0.95 }}
            title={sortOrder === "DESC" ? "Newest first" : "Oldest first"}
          >
            <motion.div
              animate={{ rotate: sortOrder === "ASC" ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpDown className="w-4 h-4" />
            </motion.div>
          </motion.button>
          <FilterDropdown
            label={`${limit} items`}
            options={limitOptions}
            selectedValue={limit}
            onSelect={setLimit}
            Icon={Filter}
            width="w-32"
          />
          <motion.button
            onClick={fetchRecent}
            disabled={loading}
            className="p-2 rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:text-white"
            whileTap={{ scale: 0.95 }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </motion.button>
        </div>
        <IdentifierRulesFilter
          value={identifierRules}
          onChange={setIdentifierRules}
        />
      </motion.div>
    );
  }

  // Mobile view
  return (
    <>
      <motion.div
        layout
        className="flex items-center justify-between w-full gap-2"
      >
        <div className="flex items-center gap-2 bg-white dark:bg-black rounded-full px-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Recent Products
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={fetchRecent}
            disabled={loading}
            className="flex items-center gap-2 p-2 text-sm font-medium rounded-md border transition-all duration-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.95 }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </motion.button>
          <motion.button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="flex items-center gap-2 p-2 text-sm font-medium rounded-md border transition-all duration-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            whileTap={{ scale: 0.95 }}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isMobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Filters
                </h3>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <CategoryFilter
                    value={category}
                    onChange={setCategory}
                    categories={categories}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sort By
                  </label>
                  <FilterDropdown
                    label={
                      sortOptions.find((o) => o.value === sortField)?.label ||
                      ""
                    }
                    options={sortOptions}
                    selectedValue={sortField}
                    onSelect={setSortField}
                    Icon={ArrowUpDown}
                    width="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Order
                  </label>
                  <motion.button
                    onClick={toggleSortOrder}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                      sortOrder === "ASC"
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>
                      {sortOrder === "DESC" ? "Newest first" : "Oldest first"}
                    </span>
                    <motion.div
                      animate={{ rotate: sortOrder === "ASC" ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </motion.div>
                  </motion.button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Items per page
                  </label>
                  <FilterDropdown
                    label={`${limit} items`}
                    options={limitOptions}
                    selectedValue={limit}
                    onSelect={setLimit}
                    Icon={Filter}
                    width="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Identifier Rules
                  </label>
                  <IdentifierRulesFilter
                    value={identifierRules}
                    onChange={setIdentifierRules}
                    vertical
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
