// app/components/UpdateShopifyButton.jsx
"use client";

import { useState } from "react";
import { RefreshCw, ShoppingBag } from "lucide-react";

export default function UpdateShopifyButton({
  shopifyId,
  productTitle,
  disabled = false,
  uuid,
  onSave,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleUpdate = async () => {
    if (!shopifyId) {
      setNotification({
        type: "error",
        message: "No Shopify ID available for this product",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsProcessing(true);

    // Step 1: Save the product first
    try {
      setNotification({
        type: "info",
        message: "Saving product before updating Shopify...",
      });
      await onSave(); // wait for save to complete
    } catch (saveError) {
      console.error("❌ Save failed:", saveError);
      setNotification({
        type: "error",
        message: `Save failed: ${saveError.message || "Please check the form"}`,
      });
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Step 2: Now update Shopify
    try {
      setNotification({
        type: "info",
        message: "Updating Shopify product description...",
      });
      const response = await fetch("/api/shopify-html-description-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopifyId, productId: uuid }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update Shopify description");

      setNotification({
        type: "success",
        message:
          result.message || "Shopify product description updated successfully!",
      });
    } catch (error) {
      console.error("❌ Shopify Update Error:", error);
      setNotification({ type: "error", message: `Error: ${error.message}` });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleUpdate}
        disabled={disabled || isProcessing || !shopifyId}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          !shopifyId
            ? "bg-gray-400 cursor-not-allowed text-gray-200"
            : isProcessing
              ? "bg-green-400 cursor-wait text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
        }`}
        title={
          !shopifyId
            ? "No Shopify ID available"
            : isProcessing
              ? "Saving product and updating Shopify..."
              : "Update Shopify product description"
        }
      >
        <RefreshCw
          className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`}
        />
        <ShoppingBag className="w-4 h-4" />
        <span className="inline">
          {isProcessing ? "Processing..." : "Update Shopify Description"}
        </span>
      </button>

      {/* Temporary notification tooltip */}
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
