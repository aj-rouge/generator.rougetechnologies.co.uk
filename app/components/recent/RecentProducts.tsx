"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { TimelineFilters } from "./TimelineFilters";
import { useRouter, useSearchParams } from "next/navigation";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100 | 200 | 500;

interface RecentProductsProps {
  initialProducts: any[];
  categories?: any[];
}

export default function RecentProducts({
  initialProducts,
  categories = [],
}: RecentProductsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for products and pagination
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Filter states (same as before)
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

  // Ref for the sentinel element
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Helper to update URL
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (limit !== 10) params.set("limit", limit.toString());
    if (sortField !== "updated_at") params.set("sortBy", sortField);
    if (sortOrder !== "DESC") params.set("sortOrder", sortOrder);
    if (category) params.set("category", category);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [limit, sortField, sortOrder, category, router]);

  // Fetch function that can either replace or append
  const fetchProducts = useCallback(
    async (append = false) => {
      const currentOffset = append ? offset : 0;
      const isLoadMore = append && offset > 0;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
          sortBy: sortField,
          sortOrder,
        });
        if (category) params.append("category", category);

        const res = await fetch(`/api/product/recent?${params}`);
        const data = await res.json();
        const newProducts = Array.isArray(data) ? data : [];

        if (append) {
          setProducts((prev) => [...prev, ...newProducts]);
          // If fewer items than requested limit, no more data
          setHasMore(newProducts.length === limit);
          setOffset((prev) => prev + newProducts.length);
        } else {
          setProducts(newProducts);
          setHasMore(newProducts.length === limit);
          setOffset(newProducts.length);
        }

        if (!append) updateUrlParams();
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        if (isLoadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [limit, sortField, sortOrder, category, offset, updateUrlParams],
  );

  // Reset pagination and fetch when filters change
  useEffect(() => {
    setOffset(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, sortField, sortOrder, category]);

  // Load more when sentinel becomes visible
  useEffect(() => {
    if (!sentinelRef.current || loadingMore || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
          fetchProducts(true);
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, fetchProducts]);

  // Format date helper
  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Category name mapping (unchanged)
  const buildCategoryNameMap = (categories: any[]): Map<string, string> => {
    const map = new Map<string, string>();
    const traverse = (cats: any[]) => {
      for (const cat of cats) {
        map.set(cat.slug, cat.name);
        if (cat.children && cat.children.length) traverse(cat.children);
      }
    };
    traverse(categories);
    return map;
  };
  const categoryNameMap = buildCategoryNameMap(categories);

  return (
    <div className="w-full max-w-6xl px-4 md:px-0">
      <div className="mb-4 space-y-3">
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
          fetchRecent={() => fetchProducts(false)}
          setShowFilters={() => {}}
          categories={categories}
          category={category}
          setCategory={setCategory}
        />
      </div>

      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {loading && products.length === 0 ? (
            <div className="grid gap-2 grid-cols-2">
              {[...Array(limit)].map((_, i) => (
                <div
                  key={i}
                  className="h-[224.5px] w-full bg-gray-100 dark:bg-gray-800/50 animate-pulse rounded-xl border border-gray-200 dark:border-gray-700"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20">
              <div className="p-4 bg-gray-200 dark:bg-gray-800 rounded-full mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium text-lg">
                No products found
              </h3>
              <button
                onClick={() => fetchProducts(false)}
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
              className="grid gap-2 grid-cols-2 overflow-y-auto"
            >
              {products.map((product, index) => (
                <ProductCard
                  key={`${product.slug}-${index}`}
                  product={product}
                  index={index}
                  sortField={sortField}
                  formatDate={formatDate}
                  categoryNameMap={categoryNameMap}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sentinel for infinite scroll */}
        {!loading && hasMore && products.length > 0 && (
          <div
            ref={sentinelRef}
            className="h-10 w-full flex justify-center items-center py-4"
          >
            {loadingMore && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
