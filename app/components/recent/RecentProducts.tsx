// components/recent/RecentProducts.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Inbox, RefreshCw, LayoutGrid, Table, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { ProductsTable } from "./ProductsTable";
import { TimelineFilters } from "./TimelineFilters";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CountFiltersType,
  IdentifierField,
  IdentifierRule,
} from "../../utils/d1/getRecentProducts";
import { useNotification } from "../../context/NotificationContext";
import PhoneCheckImportButton from "../PhoneCheckImportButton";

type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100 | 200 | 500;

interface RecentProductsProps {
  initialProducts: any[];
  categories?: any[];
}

interface SyncApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  successCount: number;
  failureCount: number;
}

interface BulkDeleteResponse {
  success: boolean;
  deletedCount?: number;
  total?: number;
  error?: string;
}

export default function RecentProducts({
  initialProducts,
  categories = [],
}: RecentProductsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addNotification, updateNotification, removeNotification } =
    useNotification();

  // Data state
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [limit, setLimit] = useState<LimitOption>(
    (Number(searchParams.get("limit")) as LimitOption) || 10,
  );
  const [hasMore, setHasMore] = useState(initialProducts.length === limit);
  const [offset, setOffset] = useState(initialProducts.length);
  const offsetRef = useRef(offset);

  // View mode
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Filter states
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get("sortBy") as SortField) || "updated_at",
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get("sortOrder") as SortOrder) || "DESC",
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

  const [draftFilter, setDraftFilter] = useState(
    searchParams.get("draft") === "true",
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [isSyncingSelected, setIsSyncingSelected] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [syncPlatform, setSyncPlatform] = useState<"shopify" | "baselinker">(
    "shopify",
  );

  const hasShopifyId = (p: any) =>
    p.shopify_id && p.shopify_id !== "" && p.shopify_id !== null;
  const hasBaselinkerId = (p: any) =>
    p.baselinker_id && p.baselinker_id !== "" && p.baselinker_id !== "null";

  const handleSelectAllWithShopifyId = useCallback(() => {
    const ids = products.filter(hasShopifyId).map((p) => p.id);
    setSelectedIds(new Set(ids));
  }, [products]);

  const handleSelectAllWithBaselinkerId = useCallback(() => {
    const ids = products.filter(hasBaselinkerId).map((p) => p.id);
    setSelectedIds(new Set(ids));
  }, [products]);

  const clearSelections = useCallback(() => setSelectedIds(new Set()), []);

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) clearSelections();
    setSelectionMode((prev) => !prev);
  }, [selectionMode, clearSelections]);

  const handleToggleProduct = useCallback((productId: string | number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  }, []);

  const syncSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsSyncingSelected(true);
    const toastId = addNotification({
      message: `Syncing ${selectedIds.size} selected product(s) to ${syncPlatform}...`,
      type: "info",
      duration: 0,
    });
    try {
      const endpoint =
        syncPlatform === "shopify"
          ? "/api/shopify-sync-all"
          : "/api/baselinker-sync-bulk";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selectedIds) }),
      });
      const data = (await res.json()) as SyncApiResponse;
      if (!res.ok) throw new Error(data.error);
      updateNotification(toastId, {
        message:
          data.message ||
          `${syncPlatform} sync: ${data.successCount} succeeded, ${data.failureCount} failed.`,
        type: data.failureCount === 0 ? "success" : "warning",
        duration: 8000,
      });
      clearSelections();
      setSelectionMode(false);
    } catch (err: any) {
      updateNotification(toastId, {
        message: `Sync failed: ${err.message}`,
        type: "error",
        duration: 6000,
      });
    } finally {
      setIsSyncingSelected(false);
      setTimeout(() => removeNotification(toastId), 10000);
    }
  };

  const toggleOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"));
  }, []);

  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (limit !== 10) params.set("limit", limit.toString());
    if (sortField !== "updated_at") params.set("sortBy", sortField);
    if (sortOrder !== "DESC") params.set("sortOrder", sortOrder);
    if (category) params.set("category", category);
    if (Object.keys(identifierRules).length > 0)
      params.set("identifierRules", JSON.stringify(identifierRules));
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
    if (draftFilter) params.set("draft", "true");
    const newUrl = `?${params.toString()}`;
    if (newUrl !== window.location.search)
      router.push(newUrl, { scroll: false });
  }, [
    limit,
    sortField,
    sortOrder,
    category,
    identifierRules,
    countFilters,
    draftFilter,
    router,
  ]);

  const isFetching = useRef(false);

  const fetchProducts = useCallback(
    async (append = false) => {
      if (isFetching.current) return;
      isFetching.current = true;
      const currentOffset = append ? offsetRef.current : 0;
      const isLoadMore = append && offsetRef.current > 0;

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
        if (draftFilter) params.append("draft", "true");
        if (Object.keys(identifierRules).length > 0)
          params.append("identifierRules", JSON.stringify(identifierRules));
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
          clearSelections();
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
      isFetching.current = false;
    },
    [
      limit,
      sortField,
      sortOrder,
      category,
      identifierRules,
      countFilters,
      draftFilter,
      updateUrlParams,
      clearSelections,
    ],
  );

  // ---------- Bulk Delete handler ----------
  const handleBulkDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} selected product(s)? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeletingSelected(true);
    const toastId = addNotification({
      message: `Deleting ${selectedIds.size} selected product(s)...`,
      type: "info",
      duration: 0,
    });

    try {
      const res = await fetch("/api/product/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selectedIds) }),
      });

      const data = (await res.json()) as BulkDeleteResponse;
      if (!res.ok) throw new Error(data.error || "Delete failed");

      updateNotification(toastId, {
        message: `Deleted ${data.deletedCount ?? 0} product(s) successfully`,
        type: "success",
        duration: 4000,
      });

      clearSelections();
      setSelectionMode(false);
      fetchProducts(false);
    } catch (err: any) {
      updateNotification(toastId, {
        message: `Delete failed: ${err.message}`,
        type: "error",
        duration: 6000,
      });
    } finally {
      setIsDeletingSelected(false);
      setTimeout(() => removeNotification(toastId), 5000);
    }
  }, [
    selectedIds,
    addNotification,
    updateNotification,
    removeNotification,
    clearSelections,
    fetchProducts,
  ]);

  // ---------- Effects ----------
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setOffset(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(false);
  }, [
    limit,
    sortField,
    sortOrder,
    category,
    identifierRules,
    countFilters,
    draftFilter,
    fetchProducts,
  ]);

  useEffect(() => {
    if (!sentinelRef.current || loadingMore || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && hasMore)
          fetchProducts(true);
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
    setDraftFilter(false);
  }, []);

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const buildCategoryNameMap = (cats: any[]): Map<string, string> => {
    const map = new Map<string, string>();
    const traverse = (c: any[]) => {
      for (const cat of c) {
        map.set(cat.slug, cat.name);
        if (cat.children && cat.children.length) traverse(cat.children);
      }
    };
    traverse(cats);
    return map;
  };
  const categoryNameMap = buildCategoryNameMap(categories);

  return (
    <div className="w-full max-w-6xl md:px-0">
      {/* View toggle row 
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => setViewMode("card")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "card"
                ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            aria-label="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "table"
                ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            aria-label="Table view"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {viewMode === "card" ? "Grid" : "Table"} view
        </span>
      </div>
*/}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PhoneCheckImportButton
            categories={categories}
            onImportComplete={() => fetchProducts(false)}
          />
        </div>
        <TimelineFilters
          sort={{
            field: sortField,
            order: sortOrder,
            toggleOrder,
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
          selectionMode={selectionMode}
          selectedCount={selectedIds.size}
          onToggleSelectionMode={toggleSelectionMode}
          onSelectAllWithShopifyId={handleSelectAllWithShopifyId}
          onSelectAllWithBaselinkerId={handleSelectAllWithBaselinkerId}
          onSyncSelected={syncSelected}
          isSyncingSelected={isSyncingSelected}
          syncPlatform={syncPlatform}
          setSyncPlatform={setSyncPlatform}
          draftFilter={draftFilter}
          onToggleDraftFilter={() => setDraftFilter(!draftFilter)}
          onBulkDeleteSelected={handleBulkDeleteSelected}
          isDeletingSelected={isDeletingSelected}
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
          ) : viewMode === "card" ? (
            <motion.div
              key="results-card"
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
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(product.id)}
                  onToggle={() => handleToggleProduct(product.id)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="results-table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ProductsTable
                products={products}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={(field) => {
                  if (field === sortField) {
                    toggleOrder();
                  } else {
                    setSortField(field as SortField);
                    setSortOrder("DESC");
                  }
                }}
                formatDate={formatDate}
                categoryNameMap={categoryNameMap}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleProduct={handleToggleProduct}
              />
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
