// components/ProductsDashboardClient.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, LogOut } from "lucide-react";
import { DarkModeToggle } from "./header/DarkModeToggle";
import RecentProducts from "./recent/RecentProducts";
import SearchBar from "./search/SearchBar";
import BulkBaselinkerDescriptionSyncButton from "./BulkBaselinkerDescriptionSyncButton";
import BulkShopifySyncButton from "./BulkShopifySyncButton";
import { useNotification } from "../context/NotificationContext";

interface ProductsDashboardClientProps {
  initialProducts: any[];
  categories: any[];
  initialCountFilters: any;
}

export default function ProductsDashboardClient({
  initialProducts,
  categories,
  initialCountFilters,
}: ProductsDashboardClientProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<
    Set<string | number>
  >(new Set());
  const { addNotification, updateNotification, removeNotification } =
    useNotification();
  const [isSyncingSelected, setIsSyncingSelected] = useState(false);

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      setSelectedProductIds(new Set());
    }
    setSelectionMode((prev) => !prev);
  }, [selectionMode]);

  const handleToggleProduct = useCallback((productId: string | number) => {
    setSelectedProductIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  }, []);

  const handleSelectAllWithShopifyId = useCallback(async () => {
    try {
      const res = await fetch("/api/products/shopify-ids");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const ids = data.ids as (string | number)[];
      setSelectedProductIds(new Set(ids));
      addNotification({
        message: `Selected ${ids.length} products with Shopify ID`,
        type: "info",
        duration: 3000,
      });
    } catch (err: any) {
      addNotification({
        message: `Failed to fetch Shopify product IDs: ${err.message}`,
        type: "error",
        duration: 4000,
      });
    }
  }, [addNotification]);

  const handleSyncSelected = async () => {
    if (selectedProductIds.size === 0) return;
    setIsSyncingSelected(true);
    const toastId = addNotification({
      message: `Syncing ${selectedProductIds.size} selected product(s)...`,
      type: "info",
      duration: 0,
    });

    try {
      const res = await fetch("/api/shopify-sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selectedProductIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateNotification(toastId, {
        message:
          data.message ||
          `Sync complete: ${data.successCount} succeeded, ${data.failureCount} failed.`,
        type: data.failureCount === 0 ? "success" : "warning",
        duration: 8000,
      });

      setSelectedProductIds(new Set());
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

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen">
      <div className="w-full flex justify-between items-center gap-3">
        <form
          action={async () => {
            const { logout } = await import("../actions/auth");
            await logout();
          }}
        >
          <button className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>

        <div className="flex gap-2">
          <DarkModeToggle />
          <Link
            href="/create"
            className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Product</span>
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-4">
        <SearchBar />
        <RecentProducts
          initialProducts={initialProducts}
          categories={categories}
          initialCountFilters={initialCountFilters}
          selectionMode={selectionMode}
          selectedIds={selectedProductIds}
          onToggleProduct={handleToggleProduct}
          onToggleSelectionMode={toggleSelectionMode}
          onSelectAllWithShopifyId={handleSelectAllWithShopifyId}
          onSyncSelected={handleSyncSelected}
          isSyncingSelected={isSyncingSelected}
          selectedCount={selectedProductIds.size}
        />
      </div>
    </div>
  );
}
