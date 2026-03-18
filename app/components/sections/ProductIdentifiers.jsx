// app/components/sections/ProductIdentifiers.jsx
"use client";

export default function ProductIdentifiers({
  asin = "",
  ean = "",
  baselinker_id = "",
  shopify_id = "",
  onUpdate,
  showIdentifiers = false,
}) {
  const handleClearIdentifiers = () => {
    onUpdate({ asin: "", ean: "" });
  };

  const handleInputChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {/* ASIN/EAN Display */}
      {showIdentifiers && (asin || ean) && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-black dark:text-gray-100 font-medium">
              Product Identifiers:
            </label>
            <button
              onClick={handleClearIdentifiers}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-4">
            {asin && (
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">ASIN</p>
                <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
                  {asin}
                </p>
              </div>
            )}
            {ean && (
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">EAN</p>
                <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                  {ean}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* External Platform IDs */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-black dark:text-gray-100 font-medium">
            External Platform IDs:
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
              onChange={(e) => handleInputChange("shopify_id", e.target.value)}
              placeholder="e.g., 6789012345"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For syncing with Shopify store
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
