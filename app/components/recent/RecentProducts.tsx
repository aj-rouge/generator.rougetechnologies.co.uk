"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Inbox, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./ProductCard";
import CategoryFilter from "./CategoryFilter";
import { TimelineFilters } from "./TimelineFilters";
import { useRouter, useSearchParams } from "next/navigation";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100;

interface RecentProductsProps {
  initialProducts: any[];
  categories?: any[]; // Add categories to props
}

export default function RecentProducts({
  initialProducts,
  categories = [], // Add categories to props with default empty array
}: RecentProductsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params or defaults
  const [recent, setRecent] = useState<any[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get("sortBy") as SortField) || "updated_at",
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get("sortOrder") as SortOrder) || "DESC",
  );
  const [limit, setLimit] = useState<LimitOption>(
    (Number(searchParams.get("limit")) as LimitOption) || 10,
  );
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [showFilters, setShowFilters] = useState(false);

  // Update URL with current filters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (limit !== 10) params.set("limit", limit.toString());
    if (sortField !== "updated_at") params.set("sortBy", sortField);
    if (sortOrder !== "DESC") params.set("sortOrder", sortOrder);
    if (category) params.set("category", category);

    router.push(`?${params.toString()}`, { scroll: false });
  }, [limit, sortField, sortOrder, category, router]);

  // Fetch data when filters change
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
      updateUrlParams();
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [limit, sortField, sortOrder, category, updateUrlParams]);

  // Auto-fetch when filters change
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
      {/* Two‑row header */}
      <div className="mb-4 space-y-3">
        {/* Row 1: Title + CategoryFilter */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Product Timeline
            </h2>
          </div>
          <CategoryFilter
            value={category}
            onChange={setCategory}
            categories={categories}
          />
        </div>

        {/* Row 2: All other filters */}
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
        />
      </div>

      {/* Results area */}
      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid gap-3">
              {[...Array(Math.min(limit, 5))].map((_, i) => (
                <div
                  key={i}
                  className="h-20 w-full bg-gray-100 dark:bg-gray-800/50 animate-pulse rounded-xl border border-gray-200 dark:border-gray-700"
                />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20">
              <div className="p-4 bg-gray-200 dark:bg-gray-800 rounded-full mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium text-lg">
                No products found
              </h3>
              <button
                onClick={fetchRecent}
                className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
              >
                <RefreshCw className="w-4 h-4" /> Refresh list
              </button>
            </div>
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
