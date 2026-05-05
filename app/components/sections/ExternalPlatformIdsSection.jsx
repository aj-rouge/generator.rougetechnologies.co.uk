"use client";

import { ValidationWrapper } from "./ValidationWrapper";

export default function ExternalPlatformIdsSection({
  baselinker_id = "",
  shopify_id = "",
  onUpdate,
}) {
  const isFilled = (value) => value && value.trim() !== "";

  const fields = [baselinker_id, shopify_id];
  const filledCount = fields.filter(isFilled).length;
  const total = fields.length;
  const score = (filledCount / total) * 100;

  const handleChange = (field, value) => {
    onUpdate?.({ [field]: value });
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
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Shopify ID
            </label>
            <input
              type="text"
              value={shopify_id || ""}
              onChange={(e) => handleChange("shopify_id", e.target.value)}
              placeholder="e.g., 6789012345"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For syncing with Shopify store
            </p>
          </div>
        </div>
      </div>
    </ValidationWrapper>
  );
}
