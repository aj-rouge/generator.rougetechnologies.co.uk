"use client";

import { ValidationWrapper } from "./ValidationWrapper";

export default function ProductIdentifiersSection({
  asin = "",
  ean = "",
  onUpdate,
}) {
  const isFilled = (value) => value && value.trim() !== "";

  const fields = [asin, ean];
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
              onChange={(e) => handleChange("asin", e.target.value)}
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
              onChange={(e) => handleChange("ean", e.target.value)}
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
  );
}
