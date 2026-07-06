"use client";

import { useState } from "react";
import { ValidationWrapper } from "./ValidationWrapper";
import { RefreshCw } from "lucide-react";

export default function ExternalPlatformIdsSection({
  baselinker_id = "",
  shopify_id = "",
  sku = "",
  title = "",
  onUpdate,
}) {
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState("");

 const isFilled = (value) => typeof value === "string" && value.trim() !== "";

  const fields = [baselinker_id, shopify_id];
  const filledCount = fields.filter(isFilled).length;
  const total = fields.length;
  const score = (filledCount / total) * 100;

  const handleChange = (field, value) => {
    console.log(`📝 ExternalPlatformIdsSection: Changing ${field} to`, value);
    onUpdate?.({ [field]: value });
  };

  const handleMatchShopify = async () => {
    console.log("🔘 Auto-match button clicked");
    console.log(`   Current SKU: "${sku}"`);
    console.log(`   Current Title: "${title}"`);
    console.log(`   Current shopify_id: "${shopify_id || "none"}"`);

    if (!sku) {
      console.warn("❌ SKU is empty");
      setMatchError("SKU is required to match Shopify product");
      setTimeout(() => setMatchError(""), 3000);
      return;
    }
    if (shopify_id) {
      console.warn(`❌ Product already has Shopify ID: ${shopify_id}`);
      setMatchError("Product already has a Shopify ID");
      setTimeout(() => setMatchError(""), 3000);
      return;
    }

    setIsMatching(true);
    setMatchError("");
    console.log("⏳ Starting Shopify matching process...");

    try {
      const requestPayload = { sku, title };
      console.log(
        "📤 Sending request to /api/product/match-shopify with:",
        requestPayload,
      );

      const response = await fetch("/api/product/match-shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      console.log(
        `📡 Response status: ${response.status} ${response.statusText}`,
      );

      const result = await response.json();
      console.log("📦 Response data:", result);

      if (!response.ok) {
        throw new Error(
          result.error ||
            `HTTP ${response.status}: Failed to match Shopify product`,
        );
      }

      if (result.success && result.shopify_id) {
        console.log(
          `✅ Match successful! Shopify ID: ${result.shopify_id}, method: ${result.matchMethod}`,
        );
        console.log(`   Message: ${result.message}`);
        onUpdate?.({ shopify_id: result.shopify_id });
      } else {
        throw new Error(result.error || "No Shopify ID returned in response");
      }
    } catch (err) {
      console.error("💥 Match error:", err);
      setMatchError(err.message);
      setTimeout(() => setMatchError(""), 4000);
    } finally {
      setIsMatching(false);
      console.log("🏁 Matching process finished.");
    }
  };

  return (
    <ValidationWrapper validationScore={score}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-black dark:text-gray-100 font-medium">
            External Platform IDs
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Baselinker ID
            </label>
            <input
              type="text"
              value={baselinker_id || ""}
              onChange={(e) => handleChange("baselinker_id", e.target.value)}
              placeholder="e.g., 12345"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For syncing with Baselinker inventory
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block flex-1">
                Shopify ID
              </label>
              {sku && !shopify_id && (
                <button
                  onClick={handleMatchShopify}
                  disabled={isMatching}
                  className="mb-1 text-xs flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isMatching ? "animate-spin" : ""}`}
                  />
                  {isMatching ? "Matching..." : "Auto-match from Shopify"}
                </button>
              )}
            </div>
            <input
              type="text"
              value={shopify_id || ""}
              onChange={(e) => handleChange("shopify_id", e.target.value)}
              placeholder="e.g., 6789012345"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                matchError
                  ? "border-red-500 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {matchError && (
              <p className="text-xs text-red-500 mt-1">{matchError}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For syncing with Shopify store
            </p>
          </div>
        </div>
      </div>
    </ValidationWrapper>
  );
}
