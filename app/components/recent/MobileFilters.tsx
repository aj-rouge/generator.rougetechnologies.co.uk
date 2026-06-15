"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  RefreshCw,
  X,
  CheckSquare,
  ShoppingBag,
  Package,
  Loader2,
} from "lucide-react";
import {
  CountFiltersType,
  IdentifierField,
  IdentifierRule,
} from "../../utils/d1/getRecentProducts";
import { useState } from "react";
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
interface TimelineFiltersProps {
  sort: SortState;
  pagination: PaginationState;
  categoryFilter: CategoryFilterState;
  identifierRules: IdentifierRulesState;
  countFilters: CountFiltersState;
  loading: boolean;
  fetchRecent: () => void;
  onClearFilters: () => void;
  selectionMode?: boolean;
  selectedCount?: number;
  onToggleSelectionMode?: () => void;
  onSelectAllWithShopifyId?: () => void;
  onSelectAllWithBaselinkerId?: () => void;
  onSyncSelected?: () => void;
  isSyncingSelected?: boolean;
  syncPlatform?: "shopify" | "baselinker";
  setSyncPlatform?: (platform: "shopify" | "baselinker") => void;
}

export const MobileFiltersBar = ({
  loading,
  fetchRecent,
  onOpenSheet,
}: {
  loading: boolean;
  fetchRecent: () => void;
  onOpenSheet: () => void;
}) => {
  return (
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
          onClick={onOpenSheet}
          className="flex items-center gap-2 p-2 text-sm font-medium rounded-md border transition-all duration-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          whileTap={{ scale: 0.95 }}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

const limitOptions = [5, 10, 20, 50, 100, 200, 500].map((n) => ({
  value: n as LimitOption,
  label: `${n} items`,
}));
const sortOptions = [
  { value: "updated_at", label: "Updated Date" },
  { value: "created_at", label: "Created Date" },
] as const;

export const MobileFiltersSheet = ({
  isOpen,
  onClose,
  filtersProps,
}: {
  isOpen: boolean;
  onClose: () => void;
  filtersProps: TimelineFiltersProps;
}) => {
  const {
    sort,
    pagination,
    categoryFilter,
    identifierRules,
    countFilters,
    onClearFilters,
    selectionMode = false,
    selectedCount = 0,
    onToggleSelectionMode,
    onSelectAllWithShopifyId,
    onSelectAllWithBaselinkerId,
    onSyncSelected,
    isSyncingSelected = false,
    syncPlatform = "shopify",
    setSyncPlatform,
  } = filtersProps;
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {selectionMode && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Platform
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSyncPlatform?.("shopify")}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                        syncPlatform === "shopify"
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 text-blue-600"
                          : "bg-white dark:bg-gray-800 border-gray-300 text-gray-700"
                      }`}
                    >
                      Shopify
                    </button>
                    <button
                      onClick={() => setSyncPlatform?.("baselinker")}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                        syncPlatform === "baselinker"
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 text-indigo-600"
                          : "bg-white dark:bg-gray-800 border-gray-300 text-gray-700"
                      }`}
                    >
                      Baselinker
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={onSyncSelected}
                      disabled={isSyncingSelected || selectedCount === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {isSyncingSelected ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckSquare className="w-4 h-4" />
                      )}
                      Sync ({selectedCount})
                    </button>
                    <button
                      onClick={onSelectAllWithShopifyId}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg"
                    >
                      <ShoppingBag className="w-4 h-4" /> All Shopify
                    </button>
                    <button
                      onClick={onSelectAllWithBaselinkerId}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg"
                    >
                      <Package className="w-4 h-4" /> All Baselinker
                    </button>
                    <button
                      onClick={onToggleSelectionMode}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              )}
              {!selectionMode && (
                <button
                  onClick={onToggleSelectionMode}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg"
                >
                  <CheckSquare className="w-4 h-4" /> Select mode
                </button>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <CategoryFilter
                  value={categoryFilter.selected}
                  onChange={categoryFilter.setSelected}
                  categories={categoryFilter.categories}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort By
                </label>
                <FilterDropdown
                  label={
                    sortOptions.find((o) => o.value === sort.field)?.label || ""
                  }
                  options={sortOptions}
                  selectedValue={sort.field}
                  onSelect={sort.setField}
                  Icon={ArrowUpDown}
                  width="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order
                </label>
                <motion.button
                  onClick={sort.toggleOrder}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                    sort.order === "ASC"
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>
                    {sort.order === "DESC" ? "Newest first" : "Oldest first"}
                  </span>
                  <motion.div
                    animate={{ rotate: sort.order === "ASC" ? 180 : 0 }}
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
                  label={`${pagination.limit} items`}
                  options={limitOptions}
                  selectedValue={pagination.limit}
                  onSelect={pagination.setLimit}
                  Icon={Filter}
                  width="w-full"
                />
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span>Advanced filters</span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
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
                        vertical
                      />
                      <CountFilters
                        value={countFilters.filters}
                        onChange={countFilters.setFilters}
                        vertical
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onClearFilters();
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
