"use client";

import { useState } from "react";
import { Package, RefreshCw } from "lucide-react";

export default function SyncBaselinkerButton({
  productTitle,
  disabled = false,
  uuid,
  onSave,
  onBaselinkerCreated, // optional – to update local form state with new baselinker_id
  baselinkerId, // optional – used only for display / tooltip
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleSync = async () => {
    if (!uuid || uuid === "null") {
      setNotification({ type: "error", message: "Product ID missing." });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsProcessing(true);

    // 1. Save any pending form changes
    try {
      setNotification({ type: "info", message: "Saving latest changes..." });
      await onSave();
    } catch (saveError) {
      setNotification({
        type: "error",
        message: `Save failed: ${saveError.message || "Please check the form"}`,
      });
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // 2. Sync with Baselinker (create or full update)
    try {
      setNotification({
        type: "info",
        message: baselinkerId
          ? "Syncing product with Baselinker (full update)..."
          : "Creating product in Baselinker...",
      });

      const response = await fetch("/api/baselinker-sync-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: uuid }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Baselinker API error");

      // If this was a new creation, update local form with the returned baselinker_id
      if (
        !baselinkerId &&
        result.baselinker_product_id &&
        onBaselinkerCreated
      ) {
        onBaselinkerCreated(result.baselinker_product_id);
      }

      setNotification({
        type: "success",
        message: result.message || "Product synced with Baselinker!",
      });
    } catch (error) {
      console.error("❌ Baselinker Sync Error:", error);
      setNotification({ type: "error", message: error.message });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const buttonText = baselinkerId ? "Sync Baselinker" : "Create in Baselinker";
  const buttonTitle = baselinkerId
    ? "Sync all product data to Baselinker (full update)"
    : "Create product in Baselinker";

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={disabled || isProcessing}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isProcessing
            ? "bg-blue-400 cursor-wait text-white"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
        title={buttonTitle}
      >
        <RefreshCw
          className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`}
        />
        <Package className="w-4 h-4" />
        <span className="hidden sm:inline">
          {isProcessing ? "Processing..." : buttonText}
        </span>
      </button>

      {notification && (
        <div
          className={`absolute top-full mt-2 right-0 z-50 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : notification.type === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}
