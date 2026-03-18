"use client";

import { motion } from "framer-motion";
import { X, ArrowUpDown, Filter } from "lucide-react";
import CategoryFilter from "./CategoryFilter";
import { FilterDropdown } from "./FilterDropdown";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100;

interface MobileFilterPanelProps {
  onClose: () => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortOrder: SortOrder;
  toggleSortOrder: () => void;
  limit: LimitOption;
  setLimit: (limit: LimitOption) => void;
  category: string;
  setCategory: (cat: string) => void;
}

export function MobileFilterPanel({
  onClose,
  sortField,
  setSortField,
  sortOrder,
  toggleSortOrder,
  limit,
  setLimit,
  category,
  setCategory,
}: MobileFilterPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl p-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Filters
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Category filter */}
        <CategoryFilter value={category} onChange={setCategory} />

        {/* Sort field */}
        <FilterDropdown
          label={sortField === "updated_at" ? "Updated Date" : "Created Date"}
          options={[
            { value: "updated_at", label: "Updated Date" },
            { value: "created_at", label: "Created Date" },
          ]}
          selectedValue={sortField}
          onSelect={setSortField}
          Icon={ArrowUpDown}
        />

        {/* Sort order toggle (simplified) */}
        <button
          onClick={toggleSortOrder}
          className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>
            Order: {sortOrder === "DESC" ? "Newest first" : "Oldest first"}
          </span>
        </button>

        {/* Limit dropdown */}
        <FilterDropdown
          label={`${limit} items`}
          options={[
            { value: 5, label: "5 items" },
            { value: 10, label: "10 items" },
            { value: 20, label: "20 items" },
            { value: 50, label: "50 items" },
            { value: 100, label: "100 items" },
          ]}
          selectedValue={limit}
          onSelect={setLimit}
          Icon={Filter}
        />
      </div>
    </motion.div>
  );
}
