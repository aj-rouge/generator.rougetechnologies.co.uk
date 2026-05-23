// components/recent/DesktopFilters.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  CountFiltersType,
  IdentifierField,
  IdentifierRule,
} from "../../utils/d1/getRecentProducts";
import CategoryFilter from "./CategoryFilter";
import { FilterDropdown } from "./FilterDropdown";
import { IdentifierRulesFilter } from "./IdentifierRulesFilter";
import { CountFilters } from "./CountFilters";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100 | 200 | 500;

interface SortState {
  field: SortField;
  order: SortOrder;
  toggleOrder: () => void;
  setField: (field: SortField) => void;
}

interface PaginationState {
  limit: LimitOption;
  setLimit: (limit: LimitOption) => void;
}

interface CategoryFilterState {
  categories: any[];
  selected: string;
  setSelected: (category: string) => void;
}

interface IdentifierRulesState {
  rules: Partial<Record<IdentifierField, IdentifierRule>>;
  setRules: (rules: Partial<Record<IdentifierField, IdentifierRule>>) => void;
}

interface CountFiltersState {
  filters: CountFiltersType;
  setFilters: (filters: CountFiltersType) => void;
}

interface DesktopFiltersProps {
  sort: SortState;
  pagination: PaginationState;
  categoryFilter: CategoryFilterState;
  identifierRules: IdentifierRulesState;
  countFilters: CountFiltersState;
  loading: boolean;
  fetchRecent: () => void;
  onClearFilters: () => void;
}

const limitOptions = [5, 10, 20, 50, 100, 200, 500].map((n) => ({
  value: n as LimitOption,
  label: `${n} items`,
}));

const sortOptions = [
  { value: "updated_at", label: "Updated Date" },
  { value: "created_at", label: "Created Date" },
] as const;

export const DesktopFilters = ({
  sort,
  pagination,
  categoryFilter,
  identifierRules,
  countFilters,
  loading,
  fetchRecent,
  onClearFilters,
}: DesktopFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Main filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-white dark:bg-black rounded-full">
          <Clock className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Recent Products
          </h2>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <CategoryFilter
            value={categoryFilter.selected}
            onChange={categoryFilter.setSelected}
            categories={categoryFilter.categories}
          />
          <FilterDropdown
            label={sortOptions.find((o) => o.value === sort.field)?.label || ""}
            options={sortOptions}
            selectedValue={sort.field}
            onSelect={sort.setField}
            Icon={ArrowUpDown}
          />
          <motion.button
            onClick={sort.toggleOrder}
            className={`p-1.5 rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${sort.order === "ASC" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:text-white"}`}
            whileTap={{ scale: 0.95 }}
            title={sort.order === "DESC" ? "Newest first" : "Oldest first"}
          >
            <motion.div
              animate={{ rotate: sort.order === "ASC" ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpDown className="w-4 h-4" />
            </motion.div>
          </motion.button>
          <FilterDropdown
            label={`${pagination.limit} items`}
            options={limitOptions}
            selectedValue={pagination.limit}
            onSelect={pagination.setLimit}
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
          <motion.button
            onClick={onClearFilters}
            className="p-2 rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:text-white"
            whileTap={{ scale: 0.95 }}
            title="Clear all filters"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            whileTap={{ scale: 0.95 }}
          >
            <span>Advanced</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Advanced filters (collapsible) */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-4"
          >
            <IdentifierRulesFilter
              value={identifierRules.rules}
              onChange={identifierRules.setRules}
              vertical={false}
            />
            <CountFilters
              value={countFilters.filters}
              onChange={countFilters.setFilters}
              vertical={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
