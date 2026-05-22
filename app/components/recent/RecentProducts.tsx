// components/recent/RecentProducts.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { TimelineFilters } from "./TimelineFilters";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CountFiltersType,
  IdentifierField,
  IdentifierRule,
} from "../../utils/d1/getRecentProducts";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100 | 200 | 500;

interface RecentProductsProps {
  initialProducts: any[];
  categories?: any[];
  initialCountFilters?: CountFiltersType;
}

export default function RecentProducts({
  initialProducts,
  categories = [],
  initialCountFilters = {},
}: RecentProductsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<any[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Individual filter states
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
  const [identifierRules, setIdentifierRules] = useState<
    Partial<Record<IdentifierField, IdentifierRule>>
  >(() => {
    const param = searchParams.get("identifierRules");
    if (param) {
      try {
        return JSON.parse(param);
      } catch {
        return {};
      }
    }
    return {};
  });
  const [countFilters, setCountFilters] = useState<CountFiltersType>(() => {
    const minImages = searchParams.get("minImages");
    const maxImages = searchParams.get("maxImages");
    const minSpecs = searchParams.get("minSpecs");
    const maxSpecs = searchParams.get("maxSpecs");
    const minParagraphs = searchParams.get("minParagraphs");
    const maxParagraphs = searchParams.get("maxParagraphs");
    const minFeatures = searchParams.get("minFeatures");
    const maxFeatures = searchParams.get("maxFeatures");
    const minFeedbacks = searchParams.get("minFeedbacks");
    const maxFeedbacks = searchParams.get("maxFeedbacks");
    return {
      image_count: {
        min: minImages ? parseInt(minImages, 10) : undefined,
        max: maxImages ? parseInt(maxImages, 10) : undefined,
      },
      specs_count: {
        min: minSpecs ? parseInt(minSpecs, 10) : undefined,
        max: maxSpecs ? parseInt(maxSpecs, 10) : undefined,
      },
      paragraphs_count: {
        min: minParagraphs ? parseInt(minParagraphs, 10) : undefined,
        max: maxParagraphs ? parseInt(maxParagraphs, 10) : undefined,
      },
      features_count: {
        min: minFeatures ? parseInt(minFeatures, 10) : undefined,
        max: maxFeatures ? parseInt(maxFeatures, 10) : undefined,
      },
      feedbacks_count: {
        min: minFeedbacks ? parseInt(minFeedbacks, 10) : undefined,
        max: maxFeedbacks ? parseInt(maxFeedbacks, 10) : undefined,
      },
    };
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true); // <-- NEW

  // Update URL only when params actually change
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (limit !== 10) params.set("limit", limit.toString());
    if (sortField !== "updated_at") params.set("sortBy", sortField);
    if (sortOrder !== "DESC") params.set("sortOrder", sortOrder);
    if (category) params.set("category", category);
    if (Object.keys(identifierRules).length > 0) {
      params.set("identifierRules", JSON.stringify(identifierRules));
    }
    if (countFilters.image_count?.min !== undefined)
      params.set("minImages", countFilters.image_count.min.toString());
    if (countFilters.image_count?.max !== undefined)
      params.set("maxImages", countFilters.image_count.max.toString());
    if (countFilters.specs_count?.min !== undefined)
      params.set("minSpecs", countFilters.specs_count.min.toString());
    if (countFilters.specs_count?.max !== undefined)
      params.set("maxSpecs", countFilters.specs_count.max.toString());
    if (countFilters.paragraphs_count?.min !== undefined)
      params.set("minParagraphs", countFilters.paragraphs_count.min.toString());
    if (countFilters.paragraphs_count?.max !== undefined)
      params.set("maxParagraphs", countFilters.paragraphs_count.max.toString());
    if (countFilters.features_count?.min !== undefined)
      params.set("minFeatures", countFilters.features_count.min.toString());
    if (countFilters.features_count?.max !== undefined)
      params.set("maxFeatures", countFilters.features_count.max.toString());
    if (countFilters.feedbacks_count?.min !== undefined)
      params.set("minFeedbacks", countFilters.feedbacks_count.min.toString());
    if (countFilters.feedbacks_count?.max !== undefined)
      params.set("maxFeedbacks", countFilters.feedbacks_count.max.toString());

    const newUrl = `?${params.toString()}`;
    const currentUrl = window.location.search;
    if (newUrl !== currentUrl) {
      router.push(newUrl, { scroll: false });
    }
  }, [
    limit,
    sortField,
    sortOrder,
    category,
    identifierRules,
    countFilters,
    router,
  ]);

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
        if (Object.keys(identifierRules).length > 0) {
          params.append("identifierRules", JSON.stringify(identifierRules));
        }
        if (countFilters.image_count?.min !== undefined)
          params.append("minImages", countFilters.image_count.min.toString());
        if (countFilters.image_count?.max !== undefined)
          params.append("maxImages", countFilters.image_count.max.toString());
        if (countFilters.specs_count?.min !== undefined)
          params.append("minSpecs", countFilters.specs_count.min.toString());
        if (countFilters.specs_count?.max !== undefined)
          params.append("maxSpecs", countFilters.specs_count.max.toString());
        if (countFilters.paragraphs_count?.min !== undefined)
          params.append(
            "minParagraphs",
            countFilters.paragraphs_count.min.toString(),
          );
        if (countFilters.paragraphs_count?.max !== undefined)
          params.append(
            "maxParagraphs",
            countFilters.paragraphs_count.max.toString(),
          );
        if (countFilters.features_count?.min !== undefined)
          params.append(
            "minFeatures",
            countFilters.features_count.min.toString(),
          );
        if (countFilters.features_count?.max !== undefined)
          params.append(
            "maxFeatures",
            countFilters.features_count.max.toString(),
          );
        if (countFilters.feedbacks_count?.min !== undefined)
          params.append(
            "minFeedbacks",
            countFilters.feedbacks_count.min.toString(),
          );
        if (countFilters.feedbacks_count?.max !== undefined)
          params.append(
            "maxFeedbacks",
            countFilters.feedbacks_count.max.toString(),
          );

        const res = await fetch(`/api/product/recent?${params}`);
        const data = await res.json();
        const newProducts = Array.isArray(data) ? data : [];

        if (append) {
          setProducts((prev) => [...prev, ...newProducts]);
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
    [
      limit,
      sortField,
      sortOrder,
      category,
      identifierRules,
      countFilters,
      offset,
      updateUrlParams,
    ],
  );

  // Reset when filters change – skip first render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setOffset(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, sortField, sortOrder, category, identifierRules, countFilters]);

  // Infinite scroll observer (unchanged)
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

  const handleClearFilters = useCallback(() => {
    setCategory("");
    setIdentifierRules({});
    setCountFilters({});
    setSortField("updated_at");
    setSortOrder("DESC");
    setLimit(10);
  }, []);

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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
    <div className="w-full max-w-6xl md:px-0">
      <div className="mb-4 space-y-3">
        <TimelineFilters
          sort={{
            field: sortField,
            order: sortOrder,
            toggleOrder: () =>
              setSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC")),
            setField: setSortField,
          }}
          pagination={{ limit, setLimit }}
          categoryFilter={{
            categories,
            selected: category,
            setSelected: setCategory,
          }}
          identifierRules={{
            rules: identifierRules,
            setRules: setIdentifierRules,
          }}
          countFilters={{ filters: countFilters, setFilters: setCountFilters }}
          loading={loading}
          fetchRecent={() => fetchProducts(false)}
          onClearFilters={handleClearFilters}
        />
      </div>

      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {loading && products.length === 0 ? (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {[...Array(limit)].map((_, i) => (
                <div
                  key={i}
                  className="h-[200px] sm:h-[224px] w-full bg-gray-100 dark:bg-gray-800/50 animate-pulse rounded-xl border border-gray-200 dark:border-gray-700"
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
              className="grid gap-2 grid-cols-1 sm:grid-cols-2 overflow-y-auto"
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
