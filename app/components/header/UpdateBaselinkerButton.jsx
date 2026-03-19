// app/components/UpdateBaselinkerButton.jsx
"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function UpdateBaselinkerButton({
  baselinkerId,
  productTitle,
  disabled = false,
  uuid,
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState(null);
  console.log("UpdateBaselinkerButton props:", {
    baselinkerId,
    productTitle,
    disabled,
    uuid,
  });
  const handleUpdate = async () => {
    if (!baselinkerId) {
      setNotification({
        type: "error",
        message: "No Baselinker ID available for this product",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsUpdating(true);
    setNotification({
      type: "info",
      message: "Updating Baselinker HTML description...",
    });

    try {
      const response = await fetch("/api/baselinker-html-description-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baselinkerId: baselinkerId,
          productId: uuid,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update Baselinker HTML");
      }

      setNotification({
        type: "success",
        message: result.message || "Baselinker HTML updated successfully!",
      });
    } catch (error) {
      console.error("❌ Baselinker Update Error:", error);
      setNotification({
        type: "error",
        message: `Error: ${error.message}`,
      });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleUpdate}
        disabled={isUpdating || disabled || !baselinkerId}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          !baselinkerId
            ? "bg-gray-400 cursor-not-allowed text-gray-200"
            : isUpdating
              ? "bg-blue-400 cursor-wait text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
        title={
          !baselinkerId
            ? "No Baselinker ID available"
            : "Update Baselinker HTML description"
        }
      >
        <RefreshCw className={`w-4 h-4 ${isUpdating ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">
          {isUpdating ? "Updating..." : "Update Baselinker HTML"}
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
