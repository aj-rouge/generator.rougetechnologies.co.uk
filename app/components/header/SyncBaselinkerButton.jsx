// components/SyncBaselinkerButton.tsx
"use client";

import { useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

export default function SyncBaselinkerButton({
  disabled = false,
  uuid,
  onSave,
  onBaselinkerCreated,
  baselinkerId,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { addNotification, updateNotification, removeNotification } =
    useNotification();

  const handleSync = async () => {
    if (!uuid || uuid === "null") {
      addNotification({
        message: "Product ID missing. Cannot sync with Baselinker.",
        type: "error",
        duration: 5000,
      });
      return;
    }

    setIsProcessing(true);
    const savingToastId = addNotification({
      message: "Saving product data...",
      type: "info",
      duration: 0, // keep until updated or removed
    });

    // --- Step 1: Save product (via onSave) ---
    try {
      await onSave();
      updateNotification(savingToastId, {
        message: "Product saved. Now syncing with Baselinker...",
        type: "info",
      });
    } catch (saveError) {
      // Show detailed save error
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

    // --- Step 2: Sync with Baselinker ---
    const syncToastId = addNotification({
      message: "Syncing with Baselinker...",
      type: "info",
      duration: 0,
    });
    // Remove the saving toast (already replaced by sync toast)
    removeNotification(savingToastId);

    try {
      const response = await fetch("/api/baselinker-sync-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: uuid }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Display detailed error from API
        throw new Error(result.error || "Baselinker API returned an error");
      }

      // Success: update notification and store baselinker_id if new
      if (
        !baselinkerId &&
        result.baselinker_product_id &&
        onBaselinkerCreated
      ) {
        onBaselinkerCreated(result.baselinker_product_id);
      }

      updateNotification(syncToastId, {
        message:
          result.message || "Product synced with Baselinker successfully!",
        type: "success",
        duration: 4000,
      });
    } catch (error) {
      console.error("Baselinker Sync Error:", error);
      let userMessage = error.message;
      // Add helpful hints based on error content
      if (
        userMessage.includes("Too many pictures") ||
        userMessage.includes("image limit")
      ) {
        userMessage +=
          " Please remove some images from the product and save before syncing again.";
      } else if (
        userMessage.includes("Category") &&
        userMessage.includes("mapped")
      ) {
        userMessage += " Contact support to fix the category mapping.";
      } else if (userMessage.includes("Network error")) {
        userMessage =
          "Network error: Unable to reach Baselinker. Check your internet connection and try again.";
      }
      updateNotification(syncToastId, {
        message: `Sync failed: ${userMessage}`,
        type: "error",
        duration: 8000,
      });
    } finally {
      setIsProcessing(false);
      // The success notification auto-removes, error notification stays for 8s
      setTimeout(() => removeNotification(syncToastId), 5000);
    }
  };

  const buttonText = baselinkerId ? "Sync Baselinker" : "Create in Baselinker";
  const buttonTitle = baselinkerId
    ? "Sync all product data to Baselinker (full update)"
    : "Create product in Baselinker";

  return (
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
      <RefreshCw className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
      <Package className="w-4 h-4" />
      <span>{isProcessing ? "Processing..." : buttonText}</span>
    </button>
  );
}
