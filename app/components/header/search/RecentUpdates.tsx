"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Inbox, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { TimelineFilters } from "./TimelineFilters";
import { MobileFilterPanel } from "./MobileFilterPanel";
import CategoryFilter from "./CategoryFilter"; // 👈 import

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100;

export default function RecentUpdates() {
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [limit, setLimit] = useState<LimitOption>(10);
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy: sortField,
        sortOrder,
      });
      if (category) params.append("category", category);

      const res = await fetch(`/api/product/recent?${params}`);
      const data = await res.json();
      setRecent(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [limit, sortField, sortOrder, category]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="w-full max-w-2xl px-4 md:px-0">
      {/* 👇 Two‑row header */}
      <div className="mb-4 space-y-3">
        {/* Row 1: Title + CategoryFilter */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Product Timeline
            </h2>
          </div>
          {/* Category filter now sits next to the title */}
          <CategoryFilter value={category} onChange={setCategory} />
        </div>

        {/* Row 2: All other filters (sort, limit, refresh) */}
        <TimelineFilters
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          toggleSortOrder={() =>
            setSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"))
          }
          limit={limit}
          setLimit={setLimit}
          loading={loading}
          fetchRecent={fetchRecent}
          setShowFilters={setShowFilters}
          // Category props are no longer needed here
        />
      </div>

      {/* Mobile filter panel (unchanged) */}
      <AnimatePresence>
        {showFilters && (
          <MobileFilterPanel
            onClose={() => setShowFilters(false)}
            sortField={sortField}
            setSortField={setSortField}
            sortOrder={sortOrder}
            toggleSortOrder={() =>
              setSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"))
            }
            limit={limit}
            setLimit={setLimit}
            category={category}
            setCategory={setCategory}
          />
        )}
      </AnimatePresence>

      {/* Results area (unchanged) */}
      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <LoadingSkeleton key="skeleton" limit={limit} />
          ) : recent.length === 0 ? (
            <EmptyState key="empty" onRefresh={fetchRecent} />
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-3"
            >
              {recent.map((product, index) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  index={index}
                  sortField={sortField}
                  formatDate={formatDate}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const LoadingSkeleton = ({ limit }: { limit: number }) => (
  <div className="grid gap-3">
    {[...Array(Math.min(limit, 5))].map((_, i) => (
      <div
        key={i}
        className="h-20 w-full bg-gray-100 dark:bg-gray-800/50 animate-pulse rounded-xl border border-gray-200 dark:border-gray-700"
      />
    ))}
  </div>
);

const EmptyState = ({ onRefresh }: { onRefresh: () => void }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20">
    <div className="p-4 bg-gray-200 dark:bg-gray-800 rounded-full mb-4">
      <Inbox className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-gray-900 dark:text-gray-100 font-medium text-lg">
      No products found
    </h3>
    <button
      onClick={onRefresh}
      className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
    >
      <RefreshCw className="w-4 h-4" /> Refresh list
    </button>
  </div>
);
