// app/components/forms/sections/PricingSection.jsx
"use client";

import { ValidationWrapper } from "./ValidationWrapper";

const MAX_VAT_RATE = 30;

export default function PricingSection({
  vat_rate = 0,
  price_brutto = "",
  rrp = "",
  onUpdate,
  disabled = false,
}) {
  const isFilled = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return !isNaN(value);
    return true;
  };

  const fields = [vat_rate, price_brutto, rrp];
  const filledCount = fields.filter(isFilled).length;
  const total = fields.length;
  const validationScore = (filledCount / total) * 100;

  const handleVatChange = (e) => {
    if (disabled) return;
    let raw = e.target.value;
    if (raw === "") {
      onUpdate({ vat_rate: "" });
      return;
    }
    let num = parseFloat(raw);
    if (isNaN(num)) {
      onUpdate({ vat_rate: "" });
      return;
    }
    const capped = Math.min(MAX_VAT_RATE, Math.max(0, num));
    onUpdate({ vat_rate: capped });
  };

  const handleNumericChange = (field, e) => {
    if (disabled) return;
    const raw = e.target.value;
    if (raw === "") {
      onUpdate({ [field]: "" });
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) {
      onUpdate({ [field]: "" });
      return;
    }
    onUpdate({ [field]: num });
  };

  return (
    <ValidationWrapper validationScore={validationScore}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className={`block text-black dark:text-gray-100 font-medium ${disabled && "opacity-50"}`}
          >
            Pricing
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filledCount}/{total} filled
          </span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              VAT Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="20"
              max={MAX_VAT_RATE}
              value={vat_rate === "" ? "" : vat_rate}
              onChange={handleVatChange}
              onBlur={handleVatChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tax rate between 0% and {MAX_VAT_RATE}% (e.g., 20 for standard UK
              VAT)
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Price (Gross, £)
            </label>
            <input
              type="number"
              step="0.01"
              value={price_brutto === "" ? "" : price_brutto}
              onChange={(e) => handleNumericChange("price_brutto", e)}
              placeholder="0.00"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gross selling price including VAT
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              RRP (£)
            </label>
            <input
              type="number"
              step="0.01"
              value={rrp === "" ? "" : rrp}
              onChange={(e) => handleNumericChange("rrp", e)}
              placeholder="0.00"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Recommended retail price (optional)
            </p>
          </div>
        </div>
      </div>
    </ValidationWrapper>
  );
}
