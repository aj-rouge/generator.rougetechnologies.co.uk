// app/components/UpdateShopifyButton.jsx
"use client";

import { useState } from "react";
import { RefreshCw, ShoppingBag } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

export default function UpdateShopifyButton({
  shopifyId,
  productTitle,
  disabled = false,
  uuid,
  onSave,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { addNotification, updateNotification, removeNotification } =
    useNotification();

  const handleUpdate = async () => {
    if (!shopifyId) {
      addNotification({
        message: "No Shopify ID available for this product",
        type: "error",
        duration: 3000,
      });
      return;
    }

    setIsProcessing(true);
    const savingToastId = addNotification({
      message: "Saving product before updating Shopify...",
      type: "info",
      duration: 0, // persistent until we update/remove it
    });

    // Step 1: Save product (via onSave)
    try {
      await onSave();
      updateNotification(savingToastId, {
        message: "Product saved. Now updating Shopify description...",
        type: "info",
      });
    } catch (saveError) {
      const errorMsg = saveError.message || "Please check the form for errors.";
      addNotification({
        message: `Failed to save product: ${errorMsg}`,
        type: "error",
        duration: 6000,
      });
      removeNotification(savingToastId);
      setIsProcessing(false);
      return;
    }

    // Step 2: Update Shopify description
    const updateToastId = addNotification({
      message: "Updating Shopify product description...",
      type: "info",
      duration: 0,
    });
    removeNotification(savingToastId); // replace the saving toast

    try {
      const response = await fetch("/api/shopify-html-description-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopifyId, productId: uuid }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update Shopify description");
      }

      updateNotification(updateToastId, {
        message:
          result.message || "Shopify product description updated successfully!",
        type: "success",
        duration: 4000,
      });
    } catch (error) {
      console.error("Shopify Update Error:", error);
      let userMessage = error.message;
      if (
        userMessage.includes("rate limit") ||
        userMessage.includes("too many")
      ) {
        userMessage =
          "Shopify rate limit reached. Please try again in a few seconds.";
      } else if (userMessage.includes("access token")) {
        userMessage =
          "Shopify authentication failed. Please check API credentials.";
      }
      updateNotification(updateToastId, {
        message: `Update failed: ${userMessage}`,
        type: "error",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
      // The success notification auto‑removes after its duration; for error we leave it a bit longer
      setTimeout(() => removeNotification(updateToastId), 5000);
    }
  };

  return (
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
      <RefreshCw className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
      <ShoppingBag className="w-4 h-4" />
      <span>
        {isProcessing ? "Processing..." : "Update Shopify Description"}
      </span>
    </button>
  );
}
