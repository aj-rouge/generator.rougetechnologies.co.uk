"use client";

import { motion } from "framer-motion";
import { ArrowUpDown, RefreshCw, Filter } from "lucide-react";
import { FilterDropdown } from "./FilterDropdown";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100;

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
  // 👇 category props removed
}

const limitOptions = [5, 10, 20, 50, 100].map((n) => ({
  value: n as LimitOption,
  label: `${n} items`,
}));

const sortOptions = [
  { value: "updated_at", label: "Updated Date" },
  { value: "created_at", label: "Created Date" },
] as const;

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
}: TimelineFiltersProps) => {
  return (
    <motion.div layout className="flex items-center gap-2 px-2">
      {/* Mobile filter button */}
      <motion.button
        layout
        onClick={() => setShowFilters(true)}
        className="
          md:hidden p-2 text-gray-500 rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors
        "
        whileTap={{ scale: 0.95 }}
      >
        <Filter className="w-5 h-5" />
      </motion.button>

      {/* Desktop filters (all remaining filters) */}
      <div className="hidden md:flex items-center gap-2">
        <FilterDropdown
          label={sortOptions.find((o) => o.value === sortField)?.label || ""}
          options={sortOptions}
          selectedValue={sortField}
          onSelect={setSortField}
          Icon={ArrowUpDown}
        />

        <motion.button
          layout
          onClick={toggleSortOrder}
          className={`
            p-1.5 rounded-md border transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
            ${
              sortOrder === "ASC"
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
            }
          `}
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
          layout
          onClick={fetchRecent}
          disabled={loading}
          className="
            p-2 rounded-md border transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
            bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
            text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          whileTap={{ scale: 0.95 }}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </motion.button>
      </div>

      {/* Refresh button for mobile is already inside the row, but we can keep it visible on mobile too */}
      <motion.button
        layout
        onClick={fetchRecent}
        disabled={loading}
        className="
          md:hidden p-2 rounded-md border transition-all duration-200
          bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
          text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        whileTap={{ scale: 0.95 }}
        title="Refresh"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      </motion.button>
    </motion.div>
  );
};
