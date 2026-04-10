"use client";

import { useState } from "react";
import { Package, PlusCircle } from "lucide-react";
export default function CreateBaselinkerButton({
  productTitle,
  disabled = false,
  uuid,
  onSave,
  onBaselinkerCreated, // <-- new prop
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleCreate = async () => {
    if (!uuid || uuid === "null") {
      setNotification({ type: "error", message: "Product ID missing." });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsProcessing(true);
    try {
      setNotification({ type: "info", message: "Saving latest changes..." });
      await onSave(); // save any pending form changes

      setNotification({
        type: "info",
        message: "Creating product in Baselinker...",
      });
      const response = await fetch("/api/baselinker-create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: uuid }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Baselinker API error");

      // ✅ Update local form state with the new baselinker_id
      if (result.baselinker_product_id && onBaselinkerCreated) {
        onBaselinkerCreated(result.baselinker_product_id);
      }

      setNotification({
        type: "success",
        message: result.message || "Product created in Baselinker!",
      });
    } catch (error) {
      console.error("❌ Baselinker Create Error:", error);
      setNotification({ type: "error", message: error.message });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleCreate}
        disabled={disabled || isProcessing}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isProcessing
            ? "bg-blue-400 cursor-wait text-white"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
        title="Create product in Baselinker (full data)"
      >
        <PlusCircle
          className={`w-4 h-4 ${isProcessing ? "animate-pulse" : ""}`}
        />
        <Package className="w-4 h-4" />
        <span className="hidden sm:inline">
          {isProcessing ? "Processing..." : "Create in Baselinker"}
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
