"use client";

import { ValidationWrapper } from "./ValidationWrapper";

export default function ProductIdentifiers({
  asin = "",
  ean = "",
  baselinker_id = "",
  shopify_id = "",
  onUpdate,
}) {
  const isFilled = (value) => value && value.trim() !== "";

  // Left card (ASIN, EAN)
  const leftFields = [asin, ean];
  const leftFilledCount = leftFields.filter(isFilled).length;
  const leftTotal = leftFields.length;
  const leftScore = (leftFilledCount / leftTotal) * 100; // 0, 50, or 100

  // Right card (Baselinker ID, Shopify ID)
  const rightFields = [baselinker_id, shopify_id];
  const rightFilledCount = rightFields.filter(isFilled).length;
  const rightTotal = rightFields.length;
  const rightScore = (rightFilledCount / rightTotal) * 100;

  const handleInputChange = (field, value) => {
    onUpdate?.({ [field]: value });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {/* ASIN/EAN Card */}
      <ValidationWrapper validationScore={leftScore}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-black dark:text-gray-100 font-medium">
              Product Identifiers
            </label>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                ASIN
              </label>
              <input
                type="text"
                value={asin}
                onChange={(e) => handleInputChange("asin", e.target.value)}
                placeholder="e.g., B00XXX"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Amazon Standard Identification Number
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                EAN
              </label>
              <input
                type="text"
                value={ean}
                onChange={(e) => handleInputChange("ean", e.target.value)}
                placeholder="e.g., 1234567890123"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                European Article Number
              </p>
            </div>
          </div>
        </div>
      </ValidationWrapper>

      {/* External Platform IDs Card */}
      <ValidationWrapper validationScore={rightScore}>
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
                onChange={(e) =>
                  handleInputChange("baselinker_id", e.target.value)
                }
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
                onChange={(e) =>
                  handleInputChange("shopify_id", e.target.value)
                }
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
    </div>
  );
}
